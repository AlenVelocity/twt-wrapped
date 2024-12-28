import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { Scraper, SearchMode } from "@the-convocation/twitter-scraper";
import { DailyTweets, TwitterStatsData } from "@/types/twitter";

const statsSchema = z.object({
  totalTweets: z.number(),
  totalLikes: z.number(),
  totalRetweets: z.number(),
  totalReplies: z.number(),
  mostLikedTweet: z.object({
    text: z.string(),
    url: z.string(),
    public_metrics: z.object({
      like_count: z.number(),
      retweet_count: z.number(),
      reply_count: z.number(),
    }),
  }),
  dailyTweets: z.array(z.object({
    date: z.string(),
    count: z.number(),
    intensity: z.number(),
  })),
});

const emptyStats = (username: string) => ({
  username,
  stats: {
    totalTweets: 0,
    totalLikes: 0,
    totalRetweets: 0,
    totalReplies: 0,
    mostLikedTweet: {
      text: "No tweets found in 2024",
      url: "",
      public_metrics: {
        like_count: 0,
        retweet_count: 0,
        reply_count: 0
      }
    },
    dailyTweets: [] as DailyTweets[]
  } satisfies TwitterStatsData
});

const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0]!
};

const calculateIntensity = (count: number, maxCount: number): number => {
  if (count === 0) return 0;
  if (maxCount <= 4) return count;
  
  const step = maxCount / 4;
  return Math.min(4, Math.ceil(count / step));
};

const generateDailyTweets = (tweets: any[]): DailyTweets[] => {
  // Create a map of dates to tweet counts
  const tweetsByDate = new Map<string, number>();
  
  // Initialize all dates in the year
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const endDate = now;
  
  for (let d = new Date(startOfYear); d <= endDate; d.setDate(d.getDate() + 1)) {
    tweetsByDate.set(formatDate(new Date(d)), 0);
  }
  
  // Count tweets for each date
  tweets.forEach(tweet => {
    const date = formatDate(new Date(tweet.timestamp * 1000));
    tweetsByDate.set(date, (tweetsByDate.get(date) || 0) + 1);
  });
  
  // Find max tweets in a day
  const maxTweets = Math.max(...Array.from(tweetsByDate.values()));
  
  // Convert to array and calculate intensities
  return Array.from(tweetsByDate.entries())
    .map(([date, count]) => ({
      date,
      count,
      intensity: calculateIntensity(count, maxTweets)
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
};

// Helper function to update progress
async function updateProgress(username: string, progress: number) {
  try {
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    await fetch(`${baseUrl}/api/progress`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, progress }),
    });
  } catch (error) {
    console.error('Error updating progress:', error);
  }
}

export const twitterRouter = createTRPCRouter({
  checkStats: publicProcedure
    .input(z.object({ username: z.string() }))
    .query(async ({ ctx, input }) => {
      const stats = await ctx.prisma.twitterStats.findUnique({
        where: {
          username_year: {
            username: input.username,
            year: new Date().getFullYear(),
          },
        },
      });

      if (!stats) return null;

      const parsedStats = statsSchema.safeParse(stats.stats);
      if (!parsedStats.success) {
        console.error("Invalid stats format:", parsedStats.error);
        return null;
      }

      return {
        username: stats.username,
        stats: parsedStats.data,
      };
    }),

  startFetch: publicProcedure
    .input(z.object({ username: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const scraper = new Scraper();
      await scraper.login(process.env.TWITTER_USERNAME!, process.env.TWITTER_PASSWORD!);
      
      try {
        const user = await scraper.getProfile(input.username);
        if (!user) {
          console.log("User not found");
          await updateProgress(input.username, 100);
          return null;
        }

        const tweets: any[] = [];
        const startOfYear = new Date(new Date().getFullYear(), 0, 1);
        
        try {
          const iterator = scraper.searchTweets(
            `(from:${input.username} since:2024-01-01 until:2024-12-31)`,
            Number.MAX_SAFE_INTEGER,
            SearchMode.Latest
          );
          let count = 0;
          
          for await (const tweet of iterator) {
            if (count >= 100) break;
            
            // Skip tweets without timestamp or from previous years
            if (!tweet.timestamp) continue;
            const tweetDate = new Date(tweet.timestamp * 1000);
            if (tweetDate < startOfYear) continue;
            
            // Skip retweets and replies
            if (tweet.isRetweet || tweet.isReply) continue;
            
            tweets.push({
              ...tweet,
              url: `https://twitter.com/${input.username}/status/${tweet.id}`
            });
            count++;
            
            // Update progress (assuming we'll fetch around 100 tweets)
            await updateProgress(input.username, Math.min(Math.floor((count / 100) * 100), 99));
          }
          
          console.log("Final tweets count:", tweets.length);
        } catch (e) {
          console.error("Error fetching tweets:", e);
          await updateProgress(input.username, 100);
          return null;
        }

        // If no tweets found, return empty stats
        if (!tweets.length) {
          console.log("No tweets found");
          await updateProgress(input.username, 100);
          return emptyStats(input.username);
        }
        
        // Calculate stats
        const totalTweets = tweets.length;
        const totalLikes = tweets.reduce((acc, tweet) => acc + (tweet.likes ?? 0), 0);
        const totalRetweets = tweets.reduce((acc, tweet) => acc + (tweet.retweets ?? 0), 0);
        const totalReplies = tweets.reduce((acc, tweet) => acc + (tweet.replies ?? 0), 0);
        
        // Find most liked tweet
        const mostLikedTweet = tweets.sort((a, b) => (b.likes ?? 0) - (a.likes ?? 0))[0];

        // Generate daily tweet data
        const dailyTweets = generateDailyTweets(tweets);

        const stats: TwitterStatsData = {
          totalTweets,
          totalLikes,
          totalRetweets,
          totalReplies,
          mostLikedTweet: {
            text: mostLikedTweet.text ?? "Tweet text not available",
            url: mostLikedTweet.url,
            public_metrics: {
              like_count: mostLikedTweet.likes ?? 0,
              retweet_count: mostLikedTweet.retweets ?? 0,
              reply_count: mostLikedTweet.replies ?? 0
            }
          },
          dailyTweets
        };

        // Save stats to database - use upsert to handle existing records
        await ctx.prisma.twitterStats.upsert({
          where: {
            username_year: {
              username: input.username,
              year: new Date().getFullYear(),
            },
          },
          update: {
            stats: JSON.parse(JSON.stringify(stats)),
          },
          create: {
            username: input.username,
            year: new Date().getFullYear(),
            stats: JSON.parse(JSON.stringify(stats)),
          },
        });

        // Update final progress
        await updateProgress(input.username, 100);

        console.log("Final stats:", stats);
        return {
          username: input.username,
          stats,
        };
      } catch (error) {
        console.error("Error fetching Twitter stats:", error);
        await updateProgress(input.username, 100);
        return null;
      }
    }),
}); 