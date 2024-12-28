"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Twitter, Heart, Share2, MessageCircle, TrendingUp, ChevronLeft, ChevronRight } from "lucide-react";
import { ContributionGraph } from "@/components/contribution-graph";
import { Card } from "@/components/ui/card";
import { TwitterStats } from "@/types/twitter";

interface StatsStoryProps {
  stats: TwitterStats;
}

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 1000 : -1000,
    opacity: 0
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1
  },
  exit: (direction: number) => ({
    zIndex: 0,
    x: direction < 0 ? 1000 : -1000,
    opacity: 0
  })
};

const swipeConfidenceThreshold = 10000;
const swipePower = (offset: number, velocity: number) => {
  return Math.abs(offset) * velocity;
};

export function StatsStory({ stats }: StatsStoryProps) {
  const [[page, direction], setPage] = useState([0, 0]);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  // Auto-advance slides
  useEffect(() => {
    if (isAutoPlaying) {
      const timer = setTimeout(() => {
        if (page < slides.length - 1) {
          paginate(1);
        } else {
          setIsAutoPlaying(false);
        }
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [page, isAutoPlaying]);

  const paginate = (newDirection: number) => {
    setPage([page + newDirection, newDirection]);
  };

  const slides = [
    // Welcome slide
    <motion.div
      key="welcome"
      className="flex h-full flex-col items-center justify-center text-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.5 }}
        className="mb-8 rounded-full bg-blue-500 p-6"
      >
        <Twitter className="h-12 w-12 text-white" />
      </motion.div>
      <motion.h2
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mb-4 text-4xl font-bold"
      >
        Welcome, @{stats.username}!
      </motion.h2>
      <motion.p
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-xl text-muted-foreground"
      >
        Let's look at your 2024 Twitter journey
      </motion.p>
    </motion.div>,

    // Tweet activity slide
    <motion.div
      key="activity"
      className="flex h-full flex-col items-center justify-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="mb-8 text-center"
      >
        <h2 className="mb-2 text-3xl font-bold">Your Tweet Activity</h2>
        <p className="text-xl text-muted-foreground">
          You've shared {stats.stats.totalTweets} thoughts this year
        </p>
      </motion.div>
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="w-full max-w-2xl"
      >
        <ContributionGraph dailyTweets={stats.stats.dailyTweets} />
      </motion.div>
    </motion.div>,

    // Engagement slide
    <motion.div
      key="engagement"
      className="flex h-full flex-col items-center justify-center text-center"
    >
      <motion.h2
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="mb-8 text-3xl font-bold"
      >
        Your Impact
      </motion.h2>
      <div className="grid gap-6 md:grid-cols-3">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col items-center rounded-lg bg-pink-500/10 p-6"
        >
          <Heart className="mb-2 h-8 w-8 text-pink-500" />
          <span className="text-3xl font-bold">{stats.stats.totalLikes}</span>
          <span className="text-muted-foreground">Likes Received</span>
        </motion.div>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col items-center rounded-lg bg-blue-500/10 p-6"
        >
          <Share2 className="mb-2 h-8 w-8 text-blue-500" />
          <span className="text-3xl font-bold">{stats.stats.totalRetweets}</span>
          <span className="text-muted-foreground">Retweets</span>
        </motion.div>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.6 }}
          className="flex flex-col items-center rounded-lg bg-purple-500/10 p-6"
        >
          <MessageCircle className="mb-2 h-8 w-8 text-purple-500" />
          <span className="text-3xl font-bold">{stats.stats.totalReplies}</span>
          <span className="text-muted-foreground">Replies</span>
        </motion.div>
      </div>
    </motion.div>,

    // Most liked tweet slide
    <motion.div
      key="top-tweet"
      className="flex h-full flex-col items-center justify-center px-4"
    >
      <motion.h2
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="mb-8 text-center text-3xl font-bold"
      >
        Your Most Liked Tweet
      </motion.h2>
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="w-full max-w-xl"
      >
        <Card className="overflow-hidden bg-white/5 p-6 backdrop-blur-sm">
          <p className="mb-4 text-xl">{stats.stats.mostLikedTweet.text}</p>
          <div className="flex justify-center gap-8 text-muted-foreground">
            <span className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-pink-500" />
              {stats.stats.mostLikedTweet.public_metrics.like_count}
            </span>
            <span className="flex items-center gap-2">
              <Share2 className="h-5 w-5 text-blue-500" />
              {stats.stats.mostLikedTweet.public_metrics.retweet_count}
            </span>
            <span className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-purple-500" />
              {stats.stats.mostLikedTweet.public_metrics.reply_count}
            </span>
          </div>
        </Card>
      </motion.div>
    </motion.div>,

    // Final slide
    <motion.div
      key="final"
      className="flex h-full flex-col items-center justify-center text-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="mb-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 p-6"
      >
        <Twitter className="h-12 w-12 text-white" />
      </motion.div>
      <motion.h2
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mb-4 text-4xl font-bold"
      >
        That's a Wrap!
      </motion.h2>
      <motion.p
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-xl text-muted-foreground"
      >
        Thanks for being part of Twitter in 2024
      </motion.p>
    </motion.div>
  ];

  return (
    <div className="relative h-full w-full">
      <AnimatePresence initial={false} custom={direction}>
        <motion.div
          key={page}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            x: { type: "spring", stiffness: 300, damping: 30 },
            opacity: { duration: 0.2 }
          }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={1}
          onDragEnd={(e, { offset, velocity }) => {
            const swipe = swipePower(offset.x, velocity.x);

            if (swipe < -swipeConfidenceThreshold) {
              paginate(1);
            } else if (swipe > swipeConfidenceThreshold) {
              paginate(-1);
            }
          }}
          className="absolute h-full w-full"
        >
          {slides[page]}
        </motion.div>
      </AnimatePresence>

      {/* Navigation buttons */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-4">
        {page > 0 && (
          <button
            onClick={() => paginate(-1)}
            className="rounded-full bg-white/10 p-2 backdrop-blur-sm transition-colors hover:bg-white/20"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}
        {page < slides.length - 1 && (
          <button
            onClick={() => paginate(1)}
            className="rounded-full bg-white/10 p-2 backdrop-blur-sm transition-colors hover:bg-white/20"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}
      </div>

      {/* Progress dots */}
      <div className="absolute top-8 left-0 right-0 flex justify-center gap-2">
        {slides.map((_, index) => (
          <div
            key={index}
            className={`h-1.5 w-1.5 rounded-full transition-colors ${
              index === page ? "bg-white" : "bg-white/30"
            }`}
          />
        ))}
      </div>
    </div>
  );
} 