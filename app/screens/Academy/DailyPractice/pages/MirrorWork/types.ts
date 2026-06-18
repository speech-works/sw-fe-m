export enum MirrorBehaviorSignal {
  // HIGH RELIABILITY
  JAW_TENSION = "JAW_TENSION",
  OPEN_MOUTH_HOLD = "OPEN_MOUTH_HOLD",
  LIP_PURSING = "LIP_PURSING",
  EYE_BLINKING_STRUGGLE = "EYE_BLINKING_STRUGGLE",
  BROW_TENSION = "BROW_TENSION",
  GAZE_AVERSION = "GAZE_AVERSION",
  NOSTRIL_FLARE = "NOSTRIL_FLARE",
  CHEEK_PUFFING = "CHEEK_PUFFING",

  // MEDIUM RELIABILITY
  HEAD_JERKING = "HEAD_JERKING",
  FACIAL_GRIMACING = "FACIAL_GRIMACING",
  FACIAL_TENSION_COMPOSITE = "FACIAL_TENSION_COMPOSITE",
}


export interface MirrorWorkCognitivePrompt {
  id: string;
  category: string;
  text: string;
}

export interface MirrorWorkData {
  tips: string[];
  cognitivePrompts: MirrorWorkCognitivePrompt[];
  focusAreas: MirrorBehaviorSignal[];
}

export interface DetectedSignalCounts {
  [key: string]: {
    eventCount: number;
  };
}

/**
 * Human face regions a signal maps to. Used to roll all ~11 signals up into a
 * handful of areas the user actually thinks about — so the summary reflects
 * what was detected (e.g. an OPEN_MOUTH_HOLD shows up under "mouth") instead of
 * only the three signals the old per-signal bars happened to track.
 */
export enum FaceRegion {
  EYES = "eyes",
  BROW = "brow",
  MOUTH = "mouth",
  CHEEKS = "cheeks",
  NOSE = "nose",
  HEAD = "head",
}

/**
 * Single source of truth: which face region each signal belongs to.
 * FACIAL_TENSION_COMPOSITE is intentionally absent — it's a derived signal,
 * not a region. Imported by both the session hook (capture) and the reflection
 * engine (rendering) so the two never drift.
 */
export const SIGNAL_REGION: Partial<Record<MirrorBehaviorSignal, FaceRegion>> = {
  [MirrorBehaviorSignal.EYE_BLINKING_STRUGGLE]: FaceRegion.EYES,
  [MirrorBehaviorSignal.GAZE_AVERSION]:         FaceRegion.EYES,
  [MirrorBehaviorSignal.BROW_TENSION]:          FaceRegion.BROW,
  [MirrorBehaviorSignal.JAW_TENSION]:           FaceRegion.MOUTH,
  [MirrorBehaviorSignal.OPEN_MOUTH_HOLD]:       FaceRegion.MOUTH,
  [MirrorBehaviorSignal.LIP_PURSING]:           FaceRegion.MOUTH,
  [MirrorBehaviorSignal.FACIAL_GRIMACING]:      FaceRegion.MOUTH,
  [MirrorBehaviorSignal.CHEEK_PUFFING]:         FaceRegion.CHEEKS,
  [MirrorBehaviorSignal.NOSTRIL_FLARE]:         FaceRegion.NOSE,
  [MirrorBehaviorSignal.HEAD_JERKING]:          FaceRegion.HEAD,
};

export const ALL_REGIONS = Object.values(FaceRegion);

/**
 * Shape of within-session tension over time.
 * - eased:        opened tenser, settled by the end
 * - tensed:       started calmer, more tension by the end
 * - steady:       roughly flat across the session
 * - mixed:        non-monotonic (up then down, or noisy)
 * - insufficient: not enough observed time to say anything
 */
export type WithinSessionArc =
  | "eased"
  | "tensed"
  | "steady"
  | "mixed"
  | "insufficient";

export interface WithinSessionThird {
  /** Fraction of observed time in this window with any region-mapped signal active (0..1). */
  tensionFraction: number;
  /** Total ms actually observed in this window (frames seen × dt). */
  observedMs: number;
}

export interface WithinSessionSummary {
  /** Always length 3 — opening / middle / final stretch. */
  thirds: WithinSessionThird[];
  arc: WithinSessionArc;
}

export interface AwarenessScores {
  // ── Legacy fields (kept for payload/back-compat; no longer drive the UI) ──
  gazeMaintained: number;
  jawEase: number;
  lipEase: number;
  overallEaseScore: number;

  // ── New, optional (additive — old clients/rows omit these) ──
  /** Per-region ease 0..100, aggregated across ALL signals (not just 3). */
  regionEase?: Partial<Record<FaceRegion, number>>;
  /** How tension evolved across the session (opening → final stretch). */
  withinSession?: WithinSessionSummary;
}