// api/overallState/types.ts

import {
  ClinicalDomain,
  GrowthProfileMetrics,
} from "../userBehaviorTrends/types";

// Re-export for convenience
export { ClinicalDomain, GrowthProfileMetrics };

/**
 * Clinical summary with domain scores and trends.
 */
export interface ClinicalSummary {
  domains: Record<
    ClinicalDomain,
    {
      score: number; // 0-100, higher = worse
      uncertainty: number; // Confidence level
      trend: "IMPROVING" | "STABLE" | "WORSENING";
    }
  >;
  severityCategory:
    | "MILD"
    | "MILD_TO_MODERATE"
    | "MODERATE"
    | "MODERATE_TO_SEVERE"
    | "SEVERE";
  lastOasesDate: string | null;
}

/**
 * Engagement metrics for the current period.
 */
export interface EngagementSummary {
  formResponseCount: number;
  exposurePracticeCount: number;
  avgSelfReportedAnxiety: number | null;
  avgSelfReportedConfidence: number | null;
  avgStress: number | null;
  avgTensionSeverity: number | null;
  avgProprioception: number | null;
  avgAvoidanceUrge: number | null;
  recentSecondaryCount: number | null;
  lastSecondaryCount: number | null;
  previousSecondaryCount: number | null;
  secondaryCountDelta: number | null;
  activeDaysThisWeek: number;
  totalActiveDays: number;
  avgPackConfidenceShift: number | null;
  avgPackFunctionalGain: number | null;
  avgEffort: number | null;
  avgAutonomy: number | null;
}

/**
 * Combined view with overall progress and recommendations.
 */
export interface CombinedView {
  overallProgressScore: number; // 0-100, higher = better
  recommendedFocus: ClinicalDomain;
  isStale: boolean;
  axes: GrowthProfileMetrics;
}

export type ProfileFamily = "clinical" | "engagement" | "combined";
export type GrowthProfileAxisKey = keyof GrowthProfileMetrics;
export type MomentumState = "ACTIVE" | "QUIET" | "SLIPPING";
export type NullableGrowthProfileMetrics = Record<
  GrowthProfileAxisKey,
  number | null
>;

export interface ProfileAxisDelta {
  current: number | null;
  previous: number | null;
  absoluteDelta: number | null;
  percentDelta: number | null;
  trend: "IMPROVING" | "STABLE" | "WORSENING";
  hasComparison: boolean;
}

export interface OverallStateProfile {
  axes: {
    clinical: GrowthProfileMetrics;
    engagement: NullableGrowthProfileMetrics;
    combined: GrowthProfileMetrics;
  };
  comparison: {
    hasComparison: boolean;
    previousPeriodKey: string | null;
    basis: "previous_week_bucket";
    comparisonLabel: string;
    deltas: Record<ProfileFamily, Record<GrowthProfileAxisKey, ProfileAxisDelta>>;
  };
  meta: {
    hasClinicalBaseline: boolean;
    hasRealMeasurements: boolean;
    inactiveDays: number;
    computedAt: string;
    momentumState: MomentumState;
  };
}

/**
 * Complete user state aggregate for a period (week).
 * This is the main type for the Overall State API.
 */
export interface UserOverallStateAggregate {
  id: string;
  periodKey: string; // e.g., "2026-W06" (ISO week)
  periodStart: string; // e.g., "2026-02-03" (Monday)
  periodEnd: string; // e.g., "2026-02-09" (Sunday)
  clinical: ClinicalSummary;
  engagement: EngagementSummary;
  combined: CombinedView;
  computedAt: string;
  profile: OverallStateProfile;
}

export interface OverallStateHistoryBucket {
  periodKey: string;
  periodStart: string;
  periodEnd: string;
  hasData: boolean;
  snapshot?: UserOverallStateAggregate;
}
