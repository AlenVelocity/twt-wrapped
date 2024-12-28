"use client";

import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { api } from "@/trpc/react";
import { Twitter } from "lucide-react";
import { StatsStory } from "@/components/stats-story";
import { TwitterStats } from "@/types/twitter";
import { useEffect } from "react";

export default function UserStats() {
  const router = useRouter();
  const { username } = useParams();
  const { data: stats, isLoading } = api.twitter.checkStats.useQuery<TwitterStats | null>(
    { username: username as string },
    { enabled: !!username }
  );

  // Redirect to main page if stats not found
  useEffect(() => {
    if (!isLoading && !stats) {
      router.push('/?error=stats-not-found');
    }
  }, [stats, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <Twitter className="h-8 w-8 text-blue-500" />
        </motion.div>
      </div>
    );
  }

  if (!stats) {
    return null; // Will redirect in useEffect
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-background via-background/90 to-muted dark:from-background dark:via-purple-900/5 dark:to-background/80">
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

      <div className="relative h-screen w-full">
        <StatsStory stats={stats} />
      </div>
    </main>
  );
} 