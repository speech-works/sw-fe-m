import { DifficultyLevel } from "../dailyPractice/types";

export enum EXERCISE_ITEM_TYPE_ENUM {
  WORD = "WORD",
  SENTENCE = "SENTENCE",
}

export enum TECHNIQUE_LEVEL_ENUM {
  BEGINNER = "BEGINNER",
  INTERMEDIATE = "INTERMEDIATE",
  ADVANCED = "ADVANCED",
}

export enum TECHNIQUE_CATEGORIES_ENUM {
  STUTTERING_MODIFICATION = "STUTTERING_MODIFICATION",
  FLUENCY_SHAPING = "FLUENCY_SHAPING",
  BREATHING_RELAXATION = "BREATHING_RELAXATION",
  COGNITIVE_BEHAVIORAL = "COGNITIVE_BEHAVIORAL",
  DESENSITIZATION = "DESENSITIZATION",
  ARTICULATION = "ARTICULATION",
  VOICE_CONTROL = "VOICE_CONTROL",
  GAMES = "GAMES",
  ACCEPTANCE = "ACCEPTANCE",
  CAREGIVER = "CAREGIVER",
}

export enum TECHNIQUES_ENUM {
  IDENTIFICATION = "IDENTIFICATION",
  PULL_OUTS = "PULL_OUTS",
  CANCELLATIONS = "CANCELLATIONS",
  PREPARATORY_SETS = "PREPARATORY_SETS",
  VOLUNTARY_STUTTERING = "VOLUNTARY_STUTTERING",
  EASY_ONSET = "EASY_ONSET",
  LIGHT_ARTICULATORY_CONTACT = "LIGHT_ARTICULATORY_CONTACT",
  CONTINUOUS_PHONATION = "CONTINUOUS_PHONATION",
  PROLONGED_SPEECH = "PROLONGED_SPEECH",
  PASSIVE_AIRFLOW = "PASSIVE_AIRFLOW",
  YAWN_SIGH_TECHNIQUE = "YAWN_SIGH_TECHNIQUE",
}

export interface ExerciseItem {
  id: string;
  itemType: EXERCISE_ITEM_TYPE_ENUM;
  itemText: string;
  itemPhonetics?: string;
  difficulty: DifficultyLevel;
}

export type TransformedTechnique = Omit<Technique, "category">;
export type Library = {
  category: string;
  techniques: Array<TransformedTechnique>;
};

export interface TechniqueCategory {
  id: TECHNIQUE_CATEGORIES_ENUM;
  name: string;
  description: string;
}

export interface Technique {
  id: TECHNIQUES_ENUM;
  name: string;
  description: string;
  level: TECHNIQUE_LEVEL_ENUM;
  category: TechniqueCategory;
  tutorial?: Tutorial; // Will be present when includeTutorial: true
}

export interface QuizQuestion {
  id: string;
  questionText: string;
  options: Array<QuizQuestionOption>;
  technique: Technique;
}

export interface QuizQuestionOption {
  optionText: string;
  isCorrect: boolean;
  explanation?: string;
}

export interface FinalAnswer {
  question: QuizQuestion;
  yourAnswer: QuizQuestionOption;
}

// --- THIS IS THE UPDATED INTERFACE ---
export interface Tutorial {
  id: string; // This is the UUID (e.g., "a1b2c3d4-...")
  title: string;
  description: string;
  videoUrl: string; // <-- This is the S3 Object Key
  glimpseS3Key: string;
  isFree: boolean;
  videoScript: string;
  learningPath: string[];
  technique: Technique;
  createdAt: string;
  updatedAt: string;
}
