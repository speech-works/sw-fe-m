export enum ClinicalDomain {
  IMPAIRMENT_STRUGGLE = "IMPAIRMENT_STRUGGLE",
  FUNCTIONAL_LIMITATION = "FUNCTIONAL_LIMITATION",
  AVOIDANCE_BEHAVIOR = "AVOIDANCE_BEHAVIOR",
  AFFECTIVE_DISTRESS = "AFFECTIVE_DISTRESS",
  PARTICIPATION_RESTRICTION = "PARTICIPATION_RESTRICTION",
}
export enum TrendSource {
  STRUCTURED_SELF_REPORT = "STRUCTURED_SELF_REPORT",
  IN_SITU_SELF_REPORT = "IN_SITU_SELF_REPORT",
  MICRO_SAMPLE = "MICRO_SAMPLE",
  SYSTEM_BEHAVIORAL_SIGNAL = "SYSTEM_BEHAVIORAL_SIGNAL",
  CLINICIAN_REPORTED = "CLINICIAN_REPORTED",
}
export interface ClinicalTrendDataPoint {
  date: string; // ISO Date String
  score: number; // 0-100
}

export interface UserBehaviorHistoricalTrend {
  domain: ClinicalDomain;
  currentScore: number;
  history: ClinicalTrendDataPoint[];
}

export type TrendsMap = Partial<
  Record<ClinicalDomain, UserBehaviorHistoricalTrend>
>;

// api response

export type UserBehaviorTrendsResponse = Array<{
  id: string;
  domain: ClinicalDomain;
  value: number; // 0–100, always HIGH BAD
  source: TrendSource;
  context?: Record<string, any>;
  createdAt: Date;
}>;

// ============================================================================
// GROWTH PROFILE TYPES (NEW)
// ============================================================================
export type GrowthProfileMetrics = {
  mastery: number; // 0-100
  ease: number;
  courage: number;
  confidence: number;
  social: number;
};

export interface GrowthProfile extends GrowthProfileMetrics {
  lastUpdated: Date | string | null;
  dataSource?:
    | "aggregate"
    | "aggregate_leaked"
    | "domain_state"
    | "raw_trends"
    | "default";
}

export interface Breakthrough {
  current: number; // Current score (0-100)
  previous?: number | null;
  absoluteDelta?: number | null;
  change: number; // Percentage change
  hasComparison?: boolean;
  trend: "IMPROVING" | "STABLE" | "WORSENING";
}

export interface WeeklyBreakthroughs {
  mastery: Breakthrough;
  ease: Breakthrough;
  courage: Breakthrough;
  confidence: Breakthrough;
  social: Breakthrough;
}
