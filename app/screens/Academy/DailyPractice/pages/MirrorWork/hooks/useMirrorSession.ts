import { useState, useCallback, useRef, useEffect } from "react";
import { MirrorBehaviorSignal, MirrorWorkCognitivePrompt, DetectedSignalCounts, AwarenessScores } from "../types";

interface SessionConfig {
  prompts: MirrorWorkCognitivePrompt[];
}

export function useMirrorSession(config: SessionConfig) {
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [nudgeMode, setNudgeMode] = useState<"ON" | "OFF">("ON");
  
  // Track tallies of observed signals
  const [signalCounts, setSignalCounts] = useState<DetectedSignalCounts>({});
  
  // Track time without signals for Positive Nudge
  const [lastTensionTime, setLastTensionTime] = useState<number | null>(null);

  const startSession = useCallback(() => {
    setSessionStartTime(Date.now());
    setIsSessionActive(true);
    setCurrentPromptIndex(0);
    setSignalCounts({});
    setLastTensionTime(Date.now());
  }, []);

  const endSession = useCallback(() => {
    setIsSessionActive(false);
  }, []);

  const nextPrompt = useCallback(() => {
    if (currentPromptIndex < config.prompts.length - 1) {
      setCurrentPromptIndex((prev) => prev + 1);
    } else {
      endSession();
    }
  }, [currentPromptIndex, config.prompts.length, endSession]);

  const toggleNudgeMode = useCallback(() => {
    setNudgeMode((prev) => (prev === "ON" ? "OFF" : "ON"));
  }, []);

  const recordSignals = useCallback((signals: MirrorBehaviorSignal[]) => {
    if (!isSessionActive || signals.length === 0) return;

    setSignalCounts((prev) => {
      const next = { ...prev };
      signals.forEach((sig) => {
        if (!next[sig]) next[sig] = { eventCount: 0 };
        next[sig].eventCount += 1;
      });
      return next;
    });

    const hasTension = signals.some((s) => 
      [MirrorBehaviorSignal.JAW_TENSION, MirrorBehaviorSignal.LIP_PURSING, MirrorBehaviorSignal.BROW_TENSION, MirrorBehaviorSignal.EYE_CLOSURE].includes(s)
    );

    if (hasTension) {
      setLastTensionTime(Date.now());
    }
  }, [isSessionActive]);

  // Derive scores at the end
  const getAwarenessScores = useCallback((): AwarenessScores => {
    const totalTimeMs = sessionStartTime ? Date.now() - sessionStartTime : 1;
    const totalTimeSec = totalTimeMs / 1000;

    // Extremely basic heuristic for score computation (100 is best)
    // In production, backend calculates this from total duration and event counts.
    // We do a rough estimate here for the Summary Screen.
    const getEase = (signal: MirrorBehaviorSignal, durationPerEvent: number = 2) => {
      const count = signalCounts[signal]?.eventCount || 0;
      const penaltySec = count * durationPerEvent;
      const ease = Math.max(0, 100 - (penaltySec / totalTimeSec) * 100);
      return Math.round(ease);
    };

    const jawEase = getEase(MirrorBehaviorSignal.JAW_TENSION);
    const lipEase = getEase(MirrorBehaviorSignal.LIP_PURSING);
    const gazeMaintained = getEase(MirrorBehaviorSignal.GAZE_AVERSION, 3);
    
    return {
      jawEase,
      lipEase,
      gazeMaintained,
      overallEaseScore: Math.round((jawEase + lipEase + gazeMaintained) / 3),
    };
  }, [signalCounts, sessionStartTime]);

  return {
    isSessionActive,
    currentPrompt: config.prompts[currentPromptIndex] || null,
    currentPromptIndex,
    nudgeMode,
    signalCounts,
    lastTensionTime,
    sessionDurationSeconds: sessionStartTime ? Math.round((Date.now() - sessionStartTime) / 1000) : 0,
    startSession,
    endSession,
    nextPrompt,
    toggleNudgeMode,
    recordSignals,
    getAwarenessScores,
  };
}
