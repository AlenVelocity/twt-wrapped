"use client";

import { motion } from "framer-motion";
import { format, getMonth } from "date-fns";
import { DailyTweets } from "@/types/twitter";

interface ContributionGraphProps {
  dailyTweets: DailyTweets[];
}

const getIntensityColor = (intensity: number, isDark: boolean) => {
  if (isDark) {
    switch (intensity) {
      case 0: return "bg-zinc-950";
      case 1: return "bg-emerald-950";
      case 2: return "bg-emerald-900";
      case 3: return "bg-emerald-800";
      case 4: return "bg-emerald-600";
      default: return "bg-zinc-950";
    }
  }
  
  switch (intensity) {
    case 0: return "bg-zinc-100";
    case 1: return "bg-emerald-200";
    case 2: return "bg-emerald-300";
    case 3: return "bg-emerald-400";
    case 4: return "bg-emerald-500";
    default: return "bg-zinc-100";
  }
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

// Constants for sizing
const BOX_SIZE = 11; // px
const BOX_GAP = 2; // px
const WEEK_WIDTH = BOX_SIZE + BOX_GAP;

export function ContributionGraph({ dailyTweets }: ContributionGraphProps) {
  // Group tweets by week for the grid layout
  const weeks: DailyTweets[][] = [];
  let currentWeek: DailyTweets[] = [];
  
  dailyTweets.forEach((day) => {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });
  
  if (currentWeek.length > 0) {
    weeks.push(currentWeek);
  }

  // Find month boundaries
  const monthLabels = weeks.map((week, weekIndex) => {
    // Skip empty weeks
    if (!week || week.length === 0) return null;
    
    // Get first day of current week
    const firstDay = week[0];
    if (!firstDay) return null;
    
    const firstDayOfWeek = new Date(firstDay.date);
    const month = getMonth(firstDayOfWeek);
    
    // Check if this is the first week or if the month changed
    const prevWeek = weeks[weekIndex - 1];
    const isFirstWeekOfMonth = weekIndex === 0 || !prevWeek || !prevWeek[0] || 
      getMonth(new Date(prevWeek[0].date)) !== month;
    
    return isFirstWeekOfMonth ? MONTHS[month] : null;
  });

  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-[800px]">
        <div className="mb-6 space-y-2">
          <h3 className="text-lg font-semibold">Tweet Activity</h3>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Less</span>
            <div className="flex gap-0.5">
              {[0, 1, 2, 3, 4].map((intensity) => (
                <div
                  key={intensity}
                  className={`h-[11px] w-[11px] rounded-sm ${getIntensityColor(intensity, false)} dark:${getIntensityColor(intensity, true)}`}
                />
              ))}
            </div>
            <span>More</span>
          </div>
        </div>

        <div className="flex gap-4">
          {/* Day labels */}
          <div className="grid grid-rows-7 gap-[2px] pt-8 text-xs text-muted-foreground">
            {DAYS.map((day, i) => (
              <div key={i} className="h-[11px] leading-[11px]">{day}</div>
            ))}
          </div>
          
          <div className="relative flex gap-[2px]">
            {/* Month labels */}
            <div className="absolute -top-6 left-0 right-0 flex text-xs text-muted-foreground">
              {monthLabels.map((month, i) => 
                month && (
                  <div 
                    key={i} 
                    className="absolute whitespace-nowrap" 
                    style={{ left: `${(i * WEEK_WIDTH)}px` }}
                  >
                    {month}
                  </div>
                )
              )}
            </div>

            {/* Contribution boxes */}
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="grid grid-rows-7 gap-[2px]">
                {week.map((day, dayIndex) => (
                  <motion.div
                    key={day.date}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: weekIndex * 0.05 + dayIndex * 0.01 }}
                    className={`group h-[11px] w-[11px] rounded-sm ${getIntensityColor(day.intensity, false)} dark:${getIntensityColor(day.intensity, true)} relative`}
                  >
                    <div className="absolute bottom-full left-1/2 mb-1.5 hidden -translate-x-1/2 rounded-md bg-black/80 px-2 py-1 text-xs text-white group-hover:block dark:bg-white/80 dark:text-black">
                      {day.count} tweets on {format(new Date(day.date), "MMM d, yyyy")}
                    </div>
                  </motion.div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 