import type {
  GrowthProfileAxisKey,
  GrowthProfileMetrics,
  MomentumState,
  ProfileAxisDelta,
} from "../overallState/types";
import type { LevelStage } from "../users";

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
  comparisonLabel: string;
  practiceTimeComparison: FlowComparisonSummary;
  sessionCountComparison: FlowComparisonSummary;
  daysActiveComparison: FlowComparisonSummary;
};

export type WeeklyGrowthBreakthrough = {
  axis: GrowthProfileAxisKey;
  label: string;
  absoluteDelta: number;
  percentDelta: number | null;
};

export type WeeklyGrowthReport = {
  axes: {
    combined: GrowthProfileMetrics;
    clinical: GrowthProfileMetrics;
  };
  comparison: {
    hasComparison: boolean;
    previousPeriodKey: string | null;
    comparisonLabel: string;
    deltas: Record<GrowthProfileAxisKey, ProfileAxisDelta>;
  };
  topBreakthroughs: WeeklyGrowthBreakthrough[];
  meta: {
    computedAt: string | Date;
    momentumState: MomentumState;
  };
};

export type WeeklyReportResponse = {
  timeframe: "weekly";
  comparisonLabel: string;
  summary: Omit<
    DetailedWeeklySummaryResponse,
    "weeklyDistribution" | "lifetimeDistribution"
  >;
  distribution: WeeklyDistribution;
  mood: Record<string, number>;
  growth: WeeklyGrowthReport;
};

export type LifetimeJourneySummary = {
  totalPracticeMinutes: number;
  totalCompletedPractices: number;
  totalPracticeDays: number;
  totalXp: number;
  level: number;
  stageTitle: string;
  stageFullTitle: string;
  progressReportCopy: string;
};

export type LifetimeGrowthJourneyPoint = {
  periodKey: string;
  periodStart: string | Date;
  periodEnd: string | Date;
  axes: GrowthProfileMetrics;
  overallProgressScore: number;
};

export type LifetimeGrowthJourneyResponse = {
  currentPeriodKey: string;
  current: GrowthProfileMetrics;
  baseline: GrowthProfileMetrics | null;
  baselinePeriodKey: string | null;
  baselineLabel: string | null;
  hasComparison: boolean;
  comparisonLabel: string;
  deltas: Record<GrowthProfileAxisKey, ProfileAxisDelta>;
  history: LifetimeGrowthJourneyPoint[];
  meta: {
    computedAt: string | Date;
    momentumState: MomentumState;
  };
};

export type LifetimeReportResponse = {
  timeframe: "lifetime";
  journey: LifetimeJourneySummary;
  distribution: WeeklyDistribution;
  growthJourney: LifetimeGrowthJourneyResponse;
  achievements: LevelStage;
};
