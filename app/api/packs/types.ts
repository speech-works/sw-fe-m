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

/**
 * A program the user does not own yet, described well enough to show it
 * honestly on Home. Prices are the SAME authoritative numbers the shop
 * charges — resolved server-side, never computed in the app.
 */
export interface RecommendationTopPick {
  catalogKey: string;
  packId: string | null;
  title: string;
  blurb: string | null;
  arcDays: number | null;
  /** Why this was matched. Absent when the server had no signal to justify one. */
  matchReason?: string;
  priceInr: number;
  anchorPriceInr: number;
}

/**
 * Why there is nothing to practise right now. The recommender only ranks packs
 * the user OWNS, so "no pack" stopped meaning "you're caught up" the moment
 * every pack became paid — it now usually means "you own nothing yet". The
 * server says WHICH so the app never has to guess, and never tells someone who
 * has done nothing that their work is done.
 */
export type RecommendationEmptyState =
  /** No onboarding signal at all — we cannot honestly match anyone. */
  | "NEEDS_ONBOARDING"
  /** Owns no programs yet; `topPick` carries a real, signal-backed suggestion. */
  | "NO_PACKS_OWNED"
  /** Owns programs and has finished them all. */
  | "ALL_COMPLETE";

export interface PackRecommendation {
  /** Null when there is nothing to practise — read `state` to find out why. */
  pack: Pack | null;
  reason?: string;
  tags?: string[];
  strategy?: "STABILIZE" | "CHALLENGE" | "MAINTAIN";
  matchScore?: number;
  isRefresher?: boolean;
  /** Present only when `pack` is null. */
  state?: RecommendationEmptyState;
  /** Present only when `pack` is null and we have something honest to suggest. */
  topPick?: RecommendationTopPick | null;
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

/**
 * The SALES projection of a pack — what GET /packs/{id}/brochure returns.
 * Mirrors PackBrochure in sw-be-2/src/types/packBrochure.types.ts.
 *
 * Deliberately carries NO blocks (that is the whole point of the split), no
 * clinical scoring internals, and no price — a price comes only from
 * GET /users/me/offers, so it can never be shown from two sources that
 * disagree.
 */
export interface PackBrochureModule {
  id: string;
  title: string;
  /**
   * The one-line hook for this day — selling copy the sales page shows as a
   * subhead under the title, so each day reads its value instead of just a
   * terse name. Optional so the app is safe against an older backend that does
   * not send it yet; render only when non-empty.
   */
  description?: string;
  orderIndex: number;
  dayIndex: number | null;
  isMandatory: boolean;
  estimatedDurationMin: number | null;
}

export interface PackBrochure {
  id: string;
  title: string;
  description: string;
  coverImage: string | null;
  category: PackCategory;
  intensity: PackIntensity;
  philosophy: PackPhilosophy;
  targetGoals: string[];
  arcDays: number | null;
  catalogKey: string | null;
  moduleCount: number;
  modules: PackBrochureModule[];
}
