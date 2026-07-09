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
  exposurePracticeCount28d: number;
  avgSelfReportedAnxiety: number | null;
  avgSelfReportedConfidence: number | null;
  avgStress: number | null;
  avgTensionSeverity: number | null;
  avgProprioception: number | null;
  avgAvoidanceUrge: number | null;
  avgReflectionMastery: number | null;
  avgReflectionEase: number | null;
  avgReflectionCourage: number | null;
  avgReflectionConfidence: number | null;
  avgReflectionSocial: number | null;
  avgEffort: number | null;
  avgAutonomy: number | null;
  avgAccuracy: number | null;
  recentSecondaryCount: number | null;
  lastSecondaryCount: number | null;
  previousSecondaryCount: number | null;
  secondaryCountDelta: number | null;
  approachRate28d: number | null;
  exposuresOffered28d: number;
  exposuresCompleted28d: number;
  activeDaysThisWeek: number;
  totalActiveDays: number;
  lastActivityDate: string | null;
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
  periodKey: string; // e.g., "2026-W06" (ISO week) — always present; use for sorting/matching
  // NOTE: the backend does not reliably send these date bounds. Treat as optional
  // and sort/match on `periodKey` instead of assuming they're strings.
  periodStart?: string; // e.g., "2026-02-03" (Monday)
  periodEnd?: string; // e.g., "2026-02-09" (Sunday)
  clinical: ClinicalSummary;
  engagement: EngagementSummary;
  combined: CombinedView;
  computedAt: string;
  profile: OverallStateProfile;
}

export interface OverallStateHistoryBucket {
  periodKey: string; // always present; use for sorting/matching
  // See note on UserOverallStateAggregate — these may be absent at runtime.
  periodStart?: string;
  periodEnd?: string;
  hasData: boolean;
  snapshot?: UserOverallStateAggregate;
}
