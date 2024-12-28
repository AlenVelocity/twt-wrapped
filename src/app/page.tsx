"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Twitter, TrendingUp, Sparkles } from "lucide-react";
import { api } from "@/trpc/react";
import { Progress } from "@/components/ui/progress";

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const floatingAnimation = {
  initial: { y: 0 },
  animate: {
    y: [-10, 10, -10],
    transition: {
      duration: 6,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

const pulseAnimation = {
  initial: { scale: 1 },
  animate: {
    scale: [1, 1.05, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

export default function Home() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Check for error in URL
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const errorParam = searchParams.get('error');
    if (errorParam === 'stats-not-found') {
      setError('Please enter your username to generate your Twitter Wrapped');
    }
    // Clean up URL
    if (errorParam) {
      router.replace('/');
    }
  }, [router]);

  const { data: existingStats } = api.twitter.checkStats.useQuery(
    { username },
    { enabled: !!username && !isLoading }
  );

  const { mutateAsync: startFetch } = api.twitter.startFetch.useMutation();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!username) return;

    setIsLoading(true);
    setProgress(0);
    setError(null);
    
    if (existingStats) {
      router.push(`/${username}`);
      return;
    }

    try {
      // Subscribe to progress updates using SSE first
      const eventSource = new EventSource(`/api/progress?username=${username}`);
      
      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'progress' && data.username === username) {
          setProgress(data.progress);
          if (data.progress === 100) {
            eventSource.close();
            router.push(`/${username}`);
          }
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
        setIsLoading(false);
        setProgress(0);
        setError('Error connecting to server. Please try again.');
      };

      // Start fetching after setting up SSE
      const result = await startFetch({ username });
      
      if (!result) {
        eventSource.close();
        setIsLoading(false);
        setProgress(0);
        setError('User not found. Please check the username and try again.');
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
      setIsLoading(false);
      setProgress(0);
      setError('An error occurred. Please try again.');
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-background via-background/90 to-muted px-4 pb-16 pt-4 dark:from-background dark:via-purple-900/5 dark:to-background/80">
      {/* Animated background elements */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 0.15, scale: 1 }}
          transition={{ duration: 2 }}
          className="absolute -left-1/4 -top-1/4 h-96 w-96 rounded-full bg-gradient-to-br from-pink-500 to-violet-500 blur-3xl dark:from-pink-500/30 dark:to-violet-500/30"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 0.15, scale: 1 }}
          transition={{ duration: 2, delay: 0.5 }}
          className="absolute -right-1/4 -bottom-1/4 h-96 w-96 rounded-full bg-gradient-to-br from-blue-500 to-emerald-500 blur-3xl dark:from-blue-500/30 dark:to-emerald-500/30"
        />
      </div>

      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="relative mx-auto max-w-4xl space-y-12 pt-16"
      >
        {/* Floating icons */}
        <motion.div
          variants={floatingAnimation}
          initial="initial"
          animate="animate"
          className="absolute -left-16 top-0 hidden opacity-20 dark:opacity-10 lg:block"
        >
          <Twitter size={64} className="text-blue-500" />
        </motion.div>
        <motion.div
          variants={floatingAnimation}
          initial="initial"
          animate="animate"
          transition={{ delay: 1 }}
          className="absolute -right-16 top-32 hidden opacity-20 dark:opacity-10 lg:block"
        >
          <TrendingUp size={64} className="text-emerald-500" />
        </motion.div>

        <motion.div
          variants={fadeInUp}
          className="text-center"
        >
          <motion.div
            variants={pulseAnimation}
            initial="initial"
            animate="animate"
            className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 backdrop-blur-sm dark:from-blue-500/10 dark:to-purple-500/10"
          >
            <Twitter className="h-12 w-12 text-blue-500" />
          </motion.div>
          <div className="relative">
            <motion.span
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="absolute -right-8 -top-6 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-pink-500/10 to-purple-500/10 px-3 py-1 text-sm font-medium text-pink-500 backdrop-blur-sm dark:from-pink-500/20 dark:to-purple-500/20"
            >
              <Sparkles className="h-4 w-4" /> 2024
            </motion.span>
            <h1 className="mb-4 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-7xl font-black tracking-tight text-transparent">
              Twitter Wrapped
            </h1>
          </div>
          <p className="mx-auto max-w-lg text-lg font-medium text-muted-foreground">
            Discover your Twitter journey through beautiful visualizations and insightful stats
          </p>
        </motion.div>

        <motion.div
          variants={fadeInUp}
          className="mx-auto grid max-w-lg gap-4 rounded-xl border bg-white/5 p-4 shadow-xl backdrop-blur-sm dark:bg-white/5"
        >
          <motion.form
            variants={fadeInUp}
            onSubmit={handleSubmit}
            className="flex flex-col gap-4 sm:flex-row"
          >
            <Input
              type="text"
              placeholder="Enter your Twitter username"
              value={username}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
              className="flex-1 border-white/10 bg-white/5 font-medium backdrop-blur-sm placeholder:text-foreground/50"
              disabled={isLoading}
            />
            <Button
              type="submit"
              disabled={isLoading || !username}
              className="bg-gradient-to-r from-blue-500 to-purple-500 px-8 font-semibold text-white transition-all hover:scale-105 hover:shadow-lg hover:shadow-purple-500/20"
            >
              {isLoading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <TrendingUp className="h-5 w-5" />
                </motion.div>
              ) : (
                "Get Stats"
              )}
            </Button>
          </motion.form>

          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-2"
            >
              <Progress value={progress} className="h-2" />
              <p className="text-center text-sm text-muted-foreground">
                {progress === 0 ? (
                  "Checking Twitter profile..."
                ) : (
                  `Fetching your Twitter stats... ${progress}%`
                )}
              </p>
            </motion.div>
          )}

          {!isLoading && !error && progress === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-sm text-muted-foreground"
            >
              Enter your Twitter username to get started
            </motion.div>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-sm text-red-500"
            >
              {error}
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </main>
  );
}
