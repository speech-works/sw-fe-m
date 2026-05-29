import { useState, useCallback, useRef } from "react";
import { MirrorBehaviorSignal, MirrorWorkCognitivePrompt, DetectedSignalCounts, AwarenessScores } from "../types";

interface SessionConfig {
  prompts: MirrorWorkCognitivePrompt[];
}

/**
 * useMirrorSession — manages session state, signal event counting,
 * and awareness score computation.
 *
 * IMPORTANT: This hook distinguishes between:
 * - `recordNewSignals()`: Called with signals that JUST started (new events).
 *   Each call increments eventCount by 1. A single sustained jaw clench
 *   = 1 event, not hundreds.
 * - `recordActiveSignals()`: Called with currently-active signals for
 *   time-based ease score tracking.
 *
 * The old implementation counted every frame where a signal was active
 * as a separate event, leading to wildly inflated counts (291 lip pursing
 * events in 1:47 = 2.7 per second = obviously wrong).
 */
export function useMirrorSession(config: SessionConfig) {
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [nudgeMode, setNudgeMode] = useState<"ON" | "OFF">("ON");

  // Track discrete event counts (only incremented by newSignals)
  const [signalCounts, setSignalCounts] = useState<DetectedSignalCounts>({});

  // Track time-in-signal for ease score computation.
  // Maps signal → total milliseconds that signal was active.
  const signalActiveTimeRef = useRef<Partial<Record<MirrorBehaviorSignal, number>>>({});
  const lastFrameTimeRef = useRef<number | null>(null);

  // Track time without signals for Positive Nudge
  const [lastTensionTime, setLastTensionTime] = useState<number | null>(null);

  // Track if first nudge-off has happened (for first-time notification)
  const [hasToggledNudgeOff, setHasToggledNudgeOff] = useState(false);

  const startSession = useCallback(() => {
    setSessionStartTime(Date.now());
    setIsSessionActive(true);
    setCurrentPromptIndex(0);
    setSignalCounts({});
    signalActiveTimeRef.current = {};
    lastFrameTimeRef.current = null;
    setLastTensionTime(Date.now());
  }, []);

  const endSession = useCallback(() => {
    setIsSessionActive(false);
  }, []);

  const nextPrompt = useCallback(() => {
    if (currentPromptIndex < config.prompts.length - 1) {
      setCurrentPromptIndex((prev) => prev + 1);
    } else {
      setCurrentPromptIndex(0);
    }
  }, [currentPromptIndex, config.prompts.length]);

  const toggleNudgeMode = useCallback(() => {
    setNudgeMode((prev) => {
      if (prev === "ON" && !hasToggledNudgeOff) {
        setHasToggledNudgeOff(true);
      }
      return prev === "ON" ? "OFF" : "ON";
    });
  }, [hasToggledNudgeOff]);

  /**
   * Record NEW signal events (transitions from inactive → active).
   * Each signal in the array is counted as exactly 1 event.
   * Called from SessionScreen when `detectionState.newSignals` changes.
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

    const hasTension = signals.some((s) =>
      [
        MirrorBehaviorSignal.JAW_TENSION,
        MirrorBehaviorSignal.LIP_PURSING,
        MirrorBehaviorSignal.BROW_TENSION,
        MirrorBehaviorSignal.EYE_BLINKING_STRUGGLE,
        MirrorBehaviorSignal.OPEN_MOUTH_HOLD,
        MirrorBehaviorSignal.FACIAL_GRIMACING,
        MirrorBehaviorSignal.NOSTRIL_FLARE,
        MirrorBehaviorSignal.CHEEK_PUFFING,
      ].includes(s),
    );

    if (hasTension) {
      setLastTensionTime(Date.now());
    }
  }, [isSessionActive]);

  /**
   * Record ACTIVE signals for time-based ease computation.
   * Called every frame. Accumulates total milliseconds each signal
   * was active across the entire session.
   */
  const recordActiveSignals = useCallback((signals: MirrorBehaviorSignal[]) => {
    if (!isSessionActive) return;

    const now = Date.now();
    const dt = lastFrameTimeRef.current ? now - lastFrameTimeRef.current : 0;
    lastFrameTimeRef.current = now;

    if (dt <= 0 || dt > 1000) return; // Skip first frame or large gaps

    signals.forEach((sig) => {
      signalActiveTimeRef.current[sig] =
        (signalActiveTimeRef.current[sig] || 0) + dt;
    });
  }, [isSessionActive]);

  /**
   * Compute awareness ease scores based on time-in-signal.
   *
   * Ease = (time_without_signal / total_session_time) * 100
   * Higher = more ease = better.
   *
   * This gives a clinically meaningful metric: "What percentage of the
   * session was the user's jaw relaxed?" rather than raw event counts.
   */
  const getAwarenessScores = useCallback((): AwarenessScores => {
    const totalTimeMs = sessionStartTime ? Date.now() - sessionStartTime : 1;

    const getEase = (signal: MirrorBehaviorSignal): number => {
      const activeMs = signalActiveTimeRef.current[signal] || 0;
      const ease = Math.max(0, 100 - (activeMs / totalTimeMs) * 100);
      return Math.round(ease);
    };

    const jawEase = getEase(MirrorBehaviorSignal.JAW_TENSION);
    const lipEase = getEase(MirrorBehaviorSignal.LIP_PURSING);
    const gazeMaintained = getEase(MirrorBehaviorSignal.GAZE_AVERSION);

    return {
      jawEase,
      lipEase,
      gazeMaintained,
      overallEaseScore: Math.round((jawEase + lipEase + gazeMaintained) / 3),
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
    startSession,
    endSession,
    nextPrompt,
    toggleNudgeMode,
    recordNewSignals,
    recordActiveSignals,
    getAwarenessScores,
  };
}
