export type PracticeStatSummary = {
  contentType: string;
  itemsCompleted: number;
  totalTime: number;
};

export type WeeklyStat = {
  /** Local‐timezone ISO date at 00:00 for each day or Date object */
  date: string | Date;
  /** Total minutes for that day */
  totalTime: number;
};

export type FlowComparisonSummary = {
  current: number;
  previousTotal: number;
  hasBenchmark: boolean;
  absoluteDelta: number | null;
  percentOfPreviousTotal: number | null;
  remainingToMatch: number | null;
  aheadOfPrevious: number | null;
  status: "NO_BASELINE" | "BEHIND" | "MATCHED" | "AHEAD";
  comparisonBasis: "previous_full_week";
  comparisonLabel: string;
};

export type WeeklyStatsResponse = {
  days: WeeklyStat[];
  percentChange: number;
  comparison: FlowComparisonSummary;
};
