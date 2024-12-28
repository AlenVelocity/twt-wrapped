import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { observable } from "@trpc/server/observable";
import { EventEmitter } from "events";
import { TRPCError } from "@trpc/server";
import { Scraper } from "@the-convocation/twitter-scraper";
import { prisma } from "@/server/db";

interface DailyTweets {
  date: string;
  count: number;
  intensity: number;
}

const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0]!;
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

// Create an event emitter for progress updates
const ee = new EventEmitter();

export const statsRouter = createTRPCRouter({
  // Check if stats exist for a user
  checkStats: publicProcedure
    .input(z.object({ username: z.string() }))
    .query(async ({ input }) => {
      const stats = await prisma.twitterStats.findFirst({
        where: {
          username: input.username.toLowerCase(),
          year: new Date().getFullYear(),
        },
      });
      return { exists: !!stats };
    }),

  // Get stats for a user
  getStats: publicProcedure
    .input(z.object({ username: z.string() }))
    .query(async ({ input }) => {
      const stats = await prisma.twitterStats.findFirst({
        where: {
          username: input.username.toLowerCase(),
          year: new Date().getFullYear(),
        },
      });

      if (!stats) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Stats not found for this user",
        });
      }

      return {
        ...stats,
        stats: stats.stats as any
      };
    }),

  // Subscribe to progress updates
  onProgress: publicProcedure
    .input(z.object({ username: z.string() }))
    .subscription(({ input }) => {
      return observable((emit) => {
        const onProgress = (progress: { username: string; status: string; progress: number }) => {
          if (progress.username === input.username.toLowerCase()) {
            emit.next(progress);
          }
        };

        ee.on("progress", onProgress);

        return () => {
          ee.off("progress", onProgress);
        };
      });
    }),

  // Start fetching stats
  fetchStats: publicProcedure
    .input(z.object({ username: z.string() }))
    .mutation(async ({ input }) => {
      const username = input.username.toLowerCase();

      // Check if stats already exist
      const existing = await prisma.twitterStats.findFirst({
        where: {
          username,
          year: new Date().getFullYear(),
        },
      });

      if (existing) {
        return {
          ...existing,
          stats: existing.stats as any
        };
      }

      // Start fetching process
      ee.emit("progress", { username, status: "Starting...", progress: 0 });

      try {
        // Initialize scraper
        ee.emit("progress", { username, status: "Connecting to Twitter...", progress: 10 });
        const scraper = new Scraper();
        await scraper.login(process.env.TWITTER_USERNAME!, process.env.TWITTER_PASSWORD!);

        // Get user profile
        ee.emit("progress", { username, status: "Verifying user...", progress: 20 });
        const user = await scraper.getProfile(username);
        if (!user) {
          throw new Error("User not found");
        }

        // Fetch tweets
        ee.emit("progress", { username, status: "Fetching tweets...", progress: 30 });
        const tweets: any[] = [];
        const startOfYear = new Date(new Date().getFullYear(), 0, 1);
        
        const iterator = scraper.getTweets(username);
        let count = 0;
        
        for await (const tweet of iterator) {
          if (count >= 100) break;
          
          if (!tweet.timestamp) continue;
          const tweetDate = new Date(tweet.timestamp * 1000);
          if (tweetDate < startOfYear) continue;
          
          if (tweet.isRetweet || tweet.isReply) continue;
          
          tweets.push({
            ...tweet,
            url: `https://twitter.com/${username}/status/${tweet.id}`
          });
          count++;

          ee.emit("progress", { 
            username, 
            status: `Fetched ${count} tweets...`, 
            progress: Math.min(30 + (count * 0.5), 80) 
          });
        }

        if (!tweets.length) {
          throw new Error("No tweets found");
        }

        // Calculate stats
        ee.emit("progress", { username, status: "Calculating stats...", progress: 90 });
        const stats = {
          totalTweets: tweets.length,
          totalLikes: tweets.reduce((acc, tweet) => acc + (tweet.likes ?? 0), 0),
          totalRetweets: tweets.reduce((acc, tweet) => acc + (tweet.retweets ?? 0), 0),
          totalReplies: tweets.reduce((acc, tweet) => acc + (tweet.replies ?? 0), 0),
          mostLikedTweet: tweets.sort((a, b) => (b.likes ?? 0) - (a.likes ?? 0))[0],
          dailyTweets: generateDailyTweets(tweets),
          tweets: tweets.map(tweet => ({
            id: tweet.id,
            text: tweet.text,
            url: tweet.url,
            likes: tweet.likes,
            retweets: tweet.retweets,
            replies: tweet.replies,
            timestamp: tweet.timestamp,
          }))
        };

        // Save to database
        ee.emit("progress", { username, status: "Saving stats...", progress: 95 });
        const saved = await prisma.twitterStats.create({
          data: {
            username,
            year: new Date().getFullYear(),
            stats: stats as any,
          },
        });

        ee.emit("progress", { username, status: "Complete!", progress: 100 });
        return {
          ...saved,
          stats: saved.stats as any
        };
      } catch (error) {
        ee.emit("progress", { 
          username, 
          status: error instanceof Error ? error.message : "Failed to fetch stats", 
          progress: -1 
        });
        throw error;
      }
    }),
}); 