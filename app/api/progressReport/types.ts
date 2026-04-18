export type WeeklyStat = {
  /** Local‐timezone ISO date at 00:00 for each day or Date object */
  date: string | Date;
  /** Total minutes for that day */
  totalTime: number;
};

export type WeeklyStatsResponse = {
  days: WeeklyStat[];
  percentChange: number;
};

/** One data point for the Days Active sparkline (last 4 weeks) */
export type HistoricalActiveDayEntry = {
  weekStart: string;
  daysActive: number;
};

/** Minutes broken down by content type (e.g. FUN_PRACTICE: 5.2) */
export type WeeklyDistribution = Record<string, number>;

export type DetailedWeeklySummaryResponse = {
  // --- Existing ---
  totalPracticeMinutes: number;
  percentagePracticeMinutesChange: number;
  totalSessions: number;
  percentageSessionsChange: number;
  // --- NEW ---
  /** Days with ≥1 completed activity (Session or Pack) this week */
  totalDaysActive: number;
  /** +/- vs last week (e.g. +2, -1) */
  daysActiveChange: number;
  /** Last 4 weeks of daysActive data for the sparkline */
  historicalActiveDays: HistoricalActiveDayEntry[];
  /** Number of past weeks with actual activity data (0 for brand-new users) */
  dataWeeksAvailable: number;
  /** Current week minutes by content type */
  weeklyDistribution: WeeklyDistribution;
  /** All-time minutes by content type */
  lifetimeDistribution: WeeklyDistribution;
};
