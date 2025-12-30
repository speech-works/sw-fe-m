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

export type TrendsMap = Partial<Record<ClinicalDomain, UserBehaviorHistoricalTrend>>;


// api response

export type  UserBehaviorTrendsResponse = Array<{
  id: string;
  domain: ClinicalDomain;
  value: number; // 0–100, always HIGH BAD
  source: TrendSource;
  context?: Record<string, any>;
  createdAt: Date;
}
>