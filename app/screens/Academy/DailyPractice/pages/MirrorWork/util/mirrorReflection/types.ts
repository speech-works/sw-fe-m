import { FaceRegion, WithinSessionArc, MirrorBehaviorSignal } from "../../types";

export type Tier = "A" | "B" | "C";

// ── Qualitative bands (the ONLY quantities that reach phrasing — never raw counts) ──
export type CueBand = "onceOrTwice" | "aFew" | "several";
export type RegionBand = "relaxed" | "mostlyEased" | "someTension" | "heldTension";

// ── Cross-session comparison (shape returned by the backend) ──────────────────
// Mirrors report.service.ts buildProfileAxisDelta, fed with EASE values so
// trend "IMPROVING" means MORE ease.
export interface ProfileAxisDelta {
  current: number | null;
  previous: number | null;
  absoluteDelta: number | null;
  percentDelta: number | null;
  trend: "IMPROVING" | "STABLE" | "WORSENING";
  hasComparison: boolean;
}

export interface MirrorWorkComparison {
  hasComparison: boolean;
  sessionsInWindow: number;
  vsLast: { overall: ProfileAxisDelta; regions: Partial<Record<FaceRegion, ProfileAxisDelta>> };
  vsRecent: { overall: ProfileAxisDelta; regions: Partial<Record<FaceRegion, ProfileAxisDelta>> };
  flags: {
    isFirstSession: boolean;
    /** Calmest of the recent comparison window (~last 5), not all-time. */
    isCalmestRecent: boolean;
    jawEasedVsLast: boolean;
    /** Longest of the recent comparison window (~last 5), not all-time. */
    isLongestRecent: boolean;
    improvedRegions: FaceRegion[];
    regressedRegions: FaceRegion[];
  };
}

// ── Engine input ──────────────────────────────────────────────────────────────
export interface ReflectionInput {
  /** Per-region ease 0..100 (all signals). From useMirrorSession.getAwarenessScores. */
  regionEase: Partial<Record<FaceRegion, number>>;
  /** Within-session arc + thirds. */
  withinSession?: { thirds: { tensionFraction: number; observedMs: number }[]; arc: WithinSessionArc };
  /** Corrected per-signal onset counts — banded, never shown raw. */
  signalCounts: Partial<Record<MirrorBehaviorSignal, { eventCount: number }>>;
  /** Cross-session comparison from the backend, or null (first session / fetch failed). */
  comparison: MirrorWorkComparison | null;
}

// ── Engine output ─────────────────────────────────────────────────────────────
export type InsightKind =
  | "opening"
  | "progress"
  | "milestone"
  | "regionObservation"
  | "arc"
  | "calm";

export interface RenderedInsight {
  text: string;
  tier: Tier;
  region?: FaceRegion;
  kind: InsightKind;
}

/** Overall presentation tone — drives hero tint. Deliberately no alarming red. */
export type ReflectionTone = "calm" | "some" | "more";

export interface ReflectionView {
  moodLabel: string;
  tone: ReflectionTone;
  insights: RenderedInsight[];
  encouragement: string;
  caveat: string;
}

/** Per-category last-used variant index, persisted across sessions to avoid repeats. */
export type RotationState = Record<string, number>;
