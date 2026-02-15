import { ClinicalDomain } from "../userBehaviorTrends/types";

export enum PackCategory {
  STABILIZATION = "STABILIZATION",
  FOUNDATION = "FOUNDATION",
  INTERVENTION = "INTERVENTION",
  MAINTENANCE = "MAINTENANCE",
}

export enum PackIntensity {
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
}

export enum PackPhilosophy {
  FOUNDATION = "FOUNDATION",
  FLUENCY = "FLUENCY",
  MODIFICATION = "MODIFICATION",
  ACCEPTANCE = "ACCEPTANCE",
  COGNITIVE = "COGNITIVE",
  SOCIAL = "SOCIAL",
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
  titleOverride?: string;
  descriptionOverride?: string;
};

export type VideoBlockContent = {
  provider: "YOUTUBE" | "VIMEO" | "S3";
  videoId: string;
  durationSeconds?: number;
  thumbnailUrl?: string;
  titleOverride?: string;
  descriptionOverride?: string;
};

export type AudioBlockContent = {
  fileUrl: string;
  durationSeconds?: number;
  titleOverride?: string;
  descriptionOverride?: string;
};

export type ReferenceBlockContent = {
  refId: string; // References PracticeActivity, Form, or Simulation ID
  titleOverride?: string;
  descriptionOverride?: string;

  // Hydrated fields (injected by backend service, may be present in API response)
  activityType?: string;
  intent?: string;
  emotionalLoad?: number;
  configuration?: any;
};

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
  estimatedDurationMin: number;
  isMandatory: boolean;
  orderIndex: number;
  blocks: ModuleContentBlock[];
}

export enum SpeechGoal {
  FEEL_CALMER = "FEEL_CALMER",
  STOP_AVOIDING = "STOP_AVOIDING",
  SPEAK_EASIER = "SPEAK_EASIER",
  HANDLE_SITUATIONS = "HANDLE_SITUATIONS",
  NOT_SURE = "NOT_SURE",
}

export interface Pack {
  id: string;
  title: string;
  description: string;
  coverImage?: string;
  category: PackCategory;
  intensity: PackIntensity;
  philosophy: PackPhilosophy;
  targetGoals: SpeechGoal[];
  modules: PackModule[];
}

export interface PackRecommendation {
  pack: Pack;
  reason: string;
  tags: string[];
  strategy: "STABILIZE" | "CHALLENGE" | "MAINTAIN";
  matchScore: number;
}

export enum PackStatus {
  NOT_STARTED = "NOT_STARTED",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
}

export enum ModuleStatus {
  NOT_STARTED = "NOT_STARTED",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  SKIPPED = "SKIPPED",
}

export interface ModuleProgress {
  moduleId: string;
  title: string;
  orderIndex: number;
  status: ModuleStatus;
  attempts: number;
  completedAt: Date | string | null;
  isMandatory: boolean;
  progress?: number;
}

export interface PackProgress {
  packStatus: PackStatus;
  completedAt: Date | string | null;
  modules: ModuleProgress[];
}
