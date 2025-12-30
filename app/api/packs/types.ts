import { ClinicalDomain } from "../userBehaviorTrends/types";

export enum PackCategory {
  STABILIZATION = "STABILIZATION", // Crisis/Grounding (CBT, Mindfulness)
  FOUNDATION = "FOUNDATION", // Education (The "Why")
  INTERVENTION = "INTERVENTION", // Active Therapy (Exposures, Techniques)
  MAINTENANCE = "MAINTENANCE", // Drills/Daily Practice
}

export enum PackIntensity {
  LOW = 1, // Passive (Listening, Reading) - Safe for Crisis
  MEDIUM = 2, // Private Practice (Mirror work)
  HIGH = 3, // Public Exposure (Real world) - High Risk/High Reward
}

export enum PackPhilosophy {
  FOUNDATION = "FOUNDATION", // Education
  FLUENCY = "FLUENCY", // Physical mechanics
  MODIFICATION = "MODIFICATION", // Changing the stutter
  ACCEPTANCE = "ACCEPTANCE", // Psychology/CBT
  COGNITIVE = "COGNITIVE", // Mindset work
  SOCIAL = "SOCIAL", // Exposures
}

export enum ContentBlockType {
  TEXT = "TEXT",
  VIDEO = "VIDEO",
  AUDIO = "AUDIO",
  IMAGE = "IMAGE",
  FORM = "FORM",
  ACTIVITY = "ACTIVITY",
  SIMULATION = "SIMULATION",
}

export type TextBlockContent = {
  markdown: string;
};

export type VideoBlockContent = {
  provider: "YOUTUBE" | "VIMEO" | "S3";
  videoId: string; // or URL
  durationSeconds?: number;
  thumbnailUrl?: string;
};

export type AudioBlockContent = {
  fileUrl: string;
  durationSeconds?: number;
};

export type ReferenceBlockContent = {
  // For FORM, ACTIVITY, SIMULATION
  refId: string;
  // Optional override title or description to show on the card
  titleOverride?: string;
  descriptionOverride?: string;
};

// Union type for the column
export type BlockContentPayload =
  | TextBlockContent
  | VideoBlockContent
  | AudioBlockContent
  | ReferenceBlockContent;


export interface ModuleContentBlock {
    id: string;
    type: ContentBlockType;
    content: BlockContentPayload;
    orderIndex: number;
}


export interface PackModule {
  id: string;
  title: string;
  description: string;
  estimatedDurationMin: number; // mins
  isMandatory?: boolean;
  orderIndex: number;
  blocks: ModuleContentBlock[];
}

export interface PackClinicalVector {
  [ClinicalDomain.AFFECTIVE_DISTRESS]: number;
  [ClinicalDomain.AVOIDANCE_BEHAVIOR]: number;
  [ClinicalDomain.IMPAIRMENT_STRUGGLE]: number;
  [ClinicalDomain.FUNCTIONAL_LIMITATION]: number;
  [ClinicalDomain.PARTICIPATION_RESTRICTION]: number;
}

export enum SpeechGoal {
  FEEL_CALMER = "FEEL_CALMER", // Emotional Relief
  STOP_AVOIDING = "STOP_AVOIDING", // Reduce Avoidance
  SPEAK_EASIER = "SPEAK_EASIER", // Reduce Physical Effort
  HANDLE_SITUATIONS = "HANDLE_SITUATIONS", // Performance / Situational Speech
  NOT_SURE = "NOT_SURE",
}

export interface Pack {
  id: string;
  title: string;
  description: string;
  coverImage?: string;
  category: PackCategory;
  intensity: PackIntensity;
  clinicalVector: PackClinicalVector;
  contraindications?: {
    domain: ClinicalDomain;
    min?: number;
    max?: number; 
    penaltyWeight: number;
  }[]
  targetGoals: SpeechGoal[];
  modules: PackModule[];
  philosophy: PackPhilosophy;
}
export interface PackRecommendation {
  pack: Pack;
  reasoning: string;
  matchScore: number;
}
export interface PackProgress {
  packId: string;
  completedModuleIds: string[];
  startedAt: string;
  lastActiveAt: string;
  percentComplete: number;
}