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

export interface AwarenessScores {
  gazeMaintained: number;
  jawEase: number;
  lipEase: number;
  overallEaseScore: number;
}

export interface MirrorWorkCompletionPayload {
  practiceActivityId: string;
  detectedSignals: DetectedSignalCounts;
  awarenessScores: AwarenessScores;
  vitals: {
    effortScore: number;
    autonomyScore: number;
  };
  detectionAccuracyRating: number;
  reflectionText: string;
  promptsAttempted: number;
  nudgeMode: "ON" | "OFF";
  sessionDurationSeconds: number;
  /** Per-signal mean confidence values from the detection session. */
  signalConfidence?: Partial<Record<MirrorBehaviorSignal, number>>;
  /** Version of the w_detection × w_clinical weight table used to compute overallEaseScore. */
  weightTableVersion?: string;
}
