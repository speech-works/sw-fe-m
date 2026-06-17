import { useState, useCallback, useRef } from "react";
import {
  MirrorBehaviorSignal,
  MirrorWorkCognitivePrompt,
  DetectedSignalCounts,
  AwarenessScores,
  FaceRegion,
  WithinSessionSummary,
  WithinSessionArc,
  SIGNAL_REGION,
  ALL_REGIONS,
} from "../types";

interface SessionConfig {
  prompts: MirrorWorkCognitivePrompt[];
}

// ── Research-derived combined weights (w_detection × w_clinical) ─────────────
// Source: spec §5.2 — derived from Yan et al. 2026 per-blendshape F1 scores,
// SSI-4 physical concomitants, and stuttering prediction literature.
// Store with weight-table version so the clinical team can re-tune without
// a data migration — the composite is always a derived view, never baked-in.
const WEIGHT_TABLE_VERSION = '1.0.0';

const W_COMBINED: Partial<Record<MirrorBehaviorSignal, number>> = {
  [MirrorBehaviorSignal.OPEN_MOUTH_HOLD]:        0.95,
  [MirrorBehaviorSignal.LIP_PURSING]:            0.85,
  [MirrorBehaviorSignal.EYE_BLINKING_STRUGGLE]:  0.85,
  [MirrorBehaviorSignal.JAW_TENSION]:            0.75,
  [MirrorBehaviorSignal.BROW_TENSION]:           0.62,
  [MirrorBehaviorSignal.FACIAL_GRIMACING]:       0.58,
  [MirrorBehaviorSignal.CHEEK_PUFFING]:          0.49,
  [MirrorBehaviorSignal.GAZE_AVERSION]:          0.46,
  [MirrorBehaviorSignal.HEAD_JERKING]:           0.36,
  [MirrorBehaviorSignal.NOSTRIL_FLARE]:          0.33,
  // FACIAL_TENSION_COMPOSITE is a derived signal — excluded from the score
};

const SCORED_SIGNALS = Object.keys(W_COMBINED) as MirrorBehaviorSignal[];

// SIGNAL_REGION / ALL_REGIONS are imported from ../types (single source of truth).

// ── Within-session arc tuning ────────────────────────────────────────────────
const BUCKET_MS = 10000;              // accumulation granularity; folded into thirds at read time
const THIRD_MIN_OBSERVED_MS = 3000;   // a third with less observed time can't anchor a comparison
const ARC_DELTA = 0.15;               // first↔last tensionFraction change to call eased/tensed
const ARC_MID_DELTA = 0.15;           // middle deviation from both endpoints to call mixed

export function useMirrorSession(config: SessionConfig) {
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [nudgeMode, setNudgeMode] = useState<"ON" | "OFF">("ON");

  const [signalCounts, setSignalCounts] = useState<DetectedSignalCounts>({});

  // signalActiveTimeMs[signal] = total ms the signal was active this session
  const signalActiveTimeRef = useRef<Partial<Record<MirrorBehaviorSignal, number>>>({});
  const lastFrameTimeRef = useRef<number | null>(null);

  // regionActiveTimeMs[region] = total ms ANY signal in that region was active
  // (accrued at most once per frame per region, so two co-active signals in one
  // region don't double-count). Covers all signals, not just the scored ones.
  const regionActiveTimeRef = useRef<Partial<Record<FaceRegion, number>>>({});

  // Within-session buckets (10s windows by elapsed time). active = ms with ANY
  // region-mapped signal active; observed = ms actually seen (frames × dt).
  const bucketActiveRef = useRef<Map<number, number>>(new Map());
  const bucketObservedRef = useRef<Map<number, number>>(new Map());
  // Mirror of sessionStartTime as a ref so recordActiveSignals stays stable.
  const sessionStartRef = useRef<number | null>(null);

  const [lastTensionTime, setLastTensionTime] = useState<number | null>(null);
  const [hasToggledNudgeOff, setHasToggledNudgeOff] = useState(false);

  const startSession = useCallback(() => {
    const now = Date.now();
    setSessionStartTime(now);
    sessionStartRef.current = now;
    setIsSessionActive(true);
    setCurrentPromptIndex(0);
    setSignalCounts({});
    signalActiveTimeRef.current = {};
    regionActiveTimeRef.current = {};
    bucketActiveRef.current = new Map();
    bucketObservedRef.current = new Map();
    lastFrameTimeRef.current = null;
    setLastTensionTime(now);
  }, []);

  const endSession = useCallback(() => {
    setIsSessionActive(false);
  }, []);

  const nextPrompt = useCallback(() => {
    setCurrentPromptIndex((prev) =>
      prev < config.prompts.length - 1 ? prev + 1 : 0
    );
  }, [config.prompts.length]);

  const toggleNudgeMode = useCallback(() => {
    setNudgeMode((prev) => {
      if (prev === "ON" && !hasToggledNudgeOff) setHasToggledNudgeOff(true);
      return prev === "ON" ? "OFF" : "ON";
    });
  }, [hasToggledNudgeOff]);

  /**
   * Record NEW signal events (inactive → active transitions).
   * Each signal counts as exactly 1 event per onset.
   */
  const recordNewSignals = useCallback((signals: MirrorBehaviorSignal[]) => {
    if (!isSessionActive || signals.length === 0) return;

    setSignalCounts((prev) => {
      const next = { ...prev };
      signals.forEach((sig) => {
        if (!next[sig]) next[sig] = { eventCount: 0 };
        next[sig]!.eventCount += 1;
      });
      return next;
    });

    const hasTension = signals.some((s) => W_COMBINED[s] !== undefined);
    if (hasTension) setLastTensionTime(Date.now());
  }, [isSessionActive]);

  /**
   * Record ACTIVE signals for time-based score computation.
   * Called every frame; accumulates total ms per signal.
   */
  const recordActiveSignals = useCallback((signals: MirrorBehaviorSignal[]) => {
    if (!isSessionActive) return;

    const now = Date.now();
    const dt = lastFrameTimeRef.current ? now - lastFrameTimeRef.current : 0;
    lastFrameTimeRef.current = now;

    if (dt <= 0 || dt > 1000) return;

    // (1) Per-signal active time — drives the legacy/clinical score. Unchanged.
    signals.forEach((sig) => {
      if (W_COMBINED[sig] !== undefined) {
        signalActiveTimeRef.current[sig] =
          (signalActiveTimeRef.current[sig] || 0) + dt;
      }
    });

    // (2) Per-region active time — covers ALL signals, dt added once per unique
    // region this frame so two co-active signals in one region don't double-count.
    const regionsThisFrame = new Set<FaceRegion>();
    signals.forEach((sig) => {
      const region = SIGNAL_REGION[sig];
      if (region) regionsThisFrame.add(region);
    });
    regionsThisFrame.forEach((region) => {
      regionActiveTimeRef.current[region] =
        (regionActiveTimeRef.current[region] || 0) + dt;
    });

    // (3) Within-session buckets. observed always advances; active advances only
    // when at least one region-mapped signal was active this frame.
    if (sessionStartRef.current !== null) {
      const bucket = Math.floor((now - sessionStartRef.current) / BUCKET_MS);
      bucketObservedRef.current.set(bucket, (bucketObservedRef.current.get(bucket) || 0) + dt);
      if (regionsThisFrame.size > 0) {
        bucketActiveRef.current.set(bucket, (bucketActiveRef.current.get(bucket) || 0) + dt);
      }
    }
  }, [isSessionActive]);

  /**
   * Compute the reliability-weighted composite ease score (spec §5.2).
   *
   * overallStruggle = Σ( w(s) * timeActive(s) / totalTime ) / Σ( w(s) )
   * overallEaseScore = round( 100 − overallStruggle * 100 )
   *
   * Per-signal contributions are normalized by the sum of weights to preserve
   * a 0–100 range regardless of which signals were observed.
   *
   * The ~3× spread in weights (0.95 → 0.33) gives high-reliability + high-clinical
   * signals ~3× the influence of low-reliability signals, without zeroing any.
   *
   * Raw components are returned so the backend can re-derive composite with
   * updated weight tables (never bake weights into stored data).
   */
  const getAwarenessScores = useCallback((): AwarenessScores => {
    const totalTimeMs = Math.max(1, sessionStartTime ? Date.now() - sessionStartTime : 1);

    // Weighted struggle contribution per signal
    const totalWeight = SCORED_SIGNALS.reduce((sum, s) => sum + (W_COMBINED[s] ?? 0), 0);
    const weightedStruggle = SCORED_SIGNALS.reduce((sum, s) => {
      const w = W_COMBINED[s] ?? 0;
      const activeMs = signalActiveTimeRef.current[s] || 0;
      return sum + w * (activeMs / totalTimeMs);
    }, 0);

    const overallStruggle = totalWeight > 0 ? weightedStruggle / totalWeight : 0;
    const overallEaseScore = Math.round(Math.max(0, Math.min(100, 100 - overallStruggle * 100)));

    // Keep legacy fields for payload backward-compatibility
    const getEase = (signal: MirrorBehaviorSignal): number => {
      const activeMs = signalActiveTimeRef.current[signal] || 0;
      return Math.round(Math.max(0, 100 - (activeMs / totalTimeMs) * 100));
    };

    // ── Per-region ease (all signals, 0..100; 100 = no tension observed) ──
    const regionEase: Partial<Record<FaceRegion, number>> = {};
    ALL_REGIONS.forEach((region) => {
      const activeMs = regionActiveTimeRef.current[region] || 0;
      regionEase[region] = Math.round(Math.max(0, Math.min(100, 100 - (activeMs / totalTimeMs) * 100)));
    });

    // ── Within-session arc: fold 10s buckets into three equal time windows ──
    const thirds = [
      { active: 0, observed: 0 },
      { active: 0, observed: 0 },
      { active: 0, observed: 0 },
    ];
    bucketObservedRef.current.forEach((observed, bucket) => {
      const third = Math.min(2, Math.floor((3 * (bucket * BUCKET_MS)) / totalTimeMs));
      thirds[third].observed += observed;
      thirds[third].active += bucketActiveRef.current.get(bucket) || 0;
    });
    const thirdSummaries = thirds.map((t) => ({
      tensionFraction: t.observed > 0 ? t.active / t.observed : 0,
      observedMs: t.observed,
    }));

    let arc: WithinSessionArc;
    const [first, mid, last] = thirdSummaries;
    if (first.observedMs < THIRD_MIN_OBSERVED_MS || last.observedMs < THIRD_MIN_OBSERVED_MS) {
      arc = "insufficient";
    } else {
      const diff = last.tensionFraction - first.tensionFraction;
      const hi = Math.max(first.tensionFraction, last.tensionFraction);
      const lo = Math.min(first.tensionFraction, last.tensionFraction);
      if (diff <= -ARC_DELTA) arc = "eased";
      else if (diff >= ARC_DELTA) arc = "tensed";
      else if (mid.tensionFraction >= hi + ARC_MID_DELTA || mid.tensionFraction <= lo - ARC_MID_DELTA) arc = "mixed";
      else arc = "steady";
    }

    const withinSession: WithinSessionSummary = { thirds: thirdSummaries, arc };

    return {
      jawEase:       getEase(MirrorBehaviorSignal.JAW_TENSION),
      lipEase:       getEase(MirrorBehaviorSignal.LIP_PURSING),
      gazeMaintained:getEase(MirrorBehaviorSignal.GAZE_AVERSION),
      overallEaseScore,
      regionEase,
      withinSession,
    };
  }, [sessionStartTime]);

  return {
    isSessionActive,
    currentPrompt: config.prompts[currentPromptIndex] || null,
    currentPromptIndex,
    nudgeMode,
    signalCounts,
    lastTensionTime,
    hasToggledNudgeOff,
    sessionDurationSeconds: sessionStartTime
      ? Math.round((Date.now() - sessionStartTime) / 1000)
      : 0,
    weightTableVersion: WEIGHT_TABLE_VERSION,
    startSession,
    endSession,
    nextPrompt,
    toggleNudgeMode,
    recordNewSignals,
    recordActiveSignals,
    getAwarenessScores,
  };
}
