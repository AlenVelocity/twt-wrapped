export interface DailyTweets {
  date: string; // YYYY-MM-DD format
  count: number;
  intensity: number; // 0-4 for coloring like GitHub
}

export interface TweetData {
  text: string;
  url: string;
  public_metrics: {
    like_count: number;
    retweet_count: number;
    reply_count: number;
  };
}

export interface TwitterStatsData {
  totalTweets: number;
  totalLikes: number;
  totalRetweets: number;
  totalReplies: number;
  mostLikedTweet: {
    text: string;
    url: string;
    public_metrics: {
      like_count: number;
      retweet_count: number;
      reply_count: number;
    };
  };
  dailyTweets: DailyTweets[];
}

export interface TwitterStats {
  username: string;
  stats: TwitterStatsData;
} 