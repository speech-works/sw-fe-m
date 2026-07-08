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
  FORM = "FORM",
  ACTIVITY = "ACTIVITY",
}

export type TextBlockContent = {
  markdown: string;
  titleOverride?: string;
  descriptionOverride?: string;
};

export type VideoBlockContent = {
  provider: "BUNNY" | "YOUTUBE" | "VIMEO" | "S3";
  videoId: string;
  videoUrl?: string; // Hydrated by backend
  durationSeconds?: number;
  thumbnailUrl?: string;
  titleOverride?: string;
  descriptionOverride?: string;
  isLocked?: boolean; // Hydrated by backend based on user premium status
};



// --- Form Block Types (hydrated by backend) ---

export enum FormFieldType {
  LIKERT_5 = "LIKERT_5",
  LIKERT_7 = "LIKERT_7",
  SLIDER = "SLIDER",
  BOOLEAN_TOGGLE = "BOOLEAN_TOGGLE",
  TEXT_INPUT = "TEXT_INPUT",
  MULTIPLE_CHOICE = "MULTIPLE_CHOICE",
}

export interface FormField {
  id: string;
  type: FormFieldType;
  label: string;
  required?: boolean;
  // LIKERT_5, LIKERT_7, SLIDER
  minLabel?: string;
  maxLabel?: string;
  // LIKERT
  ratingMax?: number;
  // SLIDER
  min?: number;
  max?: number;
  // TEXT_INPUT
  placeholder?: string;
  // MULTIPLE_CHOICE
  options?: string[];
}

export interface FormConfiguration {
  formKey: string;
  title: string;
  description: string;
  fields: FormField[];
}

export type FormBlockContent = {
  refId: string;
  formId: string; // UUID — use this for POST /forms/:formId/submit
  titleOverride?: string;
  configuration: FormConfiguration;
};

// --- Reference Block (for ACTIVITY / SIMULATION) ---

export type ReferenceBlockContent = {
  refId: string; // References PracticeActivity or Simulation ID
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
  | FormBlockContent
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
  avgValueScore?: number;
  targetHitRate?: number;
  completionCount?: number;
}

export interface PackRecommendation {
  pack: Pack;
  reason: string;
  tags: string[];
  strategy: "STABILIZE" | "CHALLENGE" | "MAINTAIN";
  matchScore: number;
  isRefresher: boolean;
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
