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

export type DetailedWeeklySummaryResponse = {
  totalPracticeMinutes: number;
  percentagePracticeMinutesChange: number;
  totalSessions: number;
  percentageSessionsChange: number;
};
