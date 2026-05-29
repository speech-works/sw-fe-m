export enum MirrorBehaviorSignal {
  // HIGH RELIABILITY
  JAW_TENSION = "JAW_TENSION",
  LIP_PURSING = "LIP_PURSING",
  EYE_CLOSURE = "EYE_CLOSURE",
  EYE_BLINK_SPIKE = "EYE_BLINK_SPIKE",
  BROW_TENSION = "BROW_TENSION",
  GAZE_AVERSION = "GAZE_AVERSION",

  // MEDIUM RELIABILITY
  HEAD_MOVEMENT = "HEAD_MOVEMENT",
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
}
