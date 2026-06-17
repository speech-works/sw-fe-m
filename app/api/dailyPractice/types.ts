// fun practice

export enum FunPracticeType {
  TONGUE_TWISTER = "TONGUE_TWISTER",
  ROLE_PLAY = "ROLE_PLAY",
  CHARACTER_VOICE = "CHARACTER_VOICE",
}

export enum DifficultyLevel {
  EASY = "EASY",
  MEDIUM = "MEDIUM",
  HARD = "HARD",
}

export interface TongueTwisterData {
  text: string;
  ipa: string;
  pronunciation: string;
  exampleAudioUrl: string;
  hints: string[];
}

/**  Role‐Play (nodes, stages, scenario, etc.) **/

/** Options within a role‐play node */

export interface RolePlayNodeOption {
  id: string;
  userLine: string;
  nextNodeId: string | null;
}
export interface RolePlayNode {
  id: string;
  npcLine: string;
  options: RolePlayNodeOption[];
}

export interface RolePlayStageBase {
  npcRole: string;
  userRole: string;
  userCharacter: string[];
  initialNodeId: string;
  dialogues: Record<string, RolePlayNode>;
}

export interface AvailableRole {
  roleName: string;
  roleDescription: string;
  fontAwesomeIcon: string;
}

export interface RolePlayScenario {
  tips: string[];
  duration: number;
  availableRoles: AvailableRole[];
  scenarioDetails: string;
}

export interface RolePlayData {
  stages: RolePlayStageBase[];
  scenario: RolePlayScenario;
}

////////////////////////////////////////////////////////////////////////////////
/** Character Voice Data Schema */

export interface CharacterVoiceData {
  exampleAudioUrl: string;
  hints: string[];
  texts: string[];
  icon: string;
}

//////////////////////////////////////////

export interface FunPractice {
  id: string;
  type: FunPracticeType;
  name: string;
  description: string;
  difficulty: DifficultyLevel;
  tongueTwisterData?: TongueTwisterData;
  rolePlayData?: RolePlayData;
  characterVoiceData?: CharacterVoiceData;
}

/////////// Cognitive practice

export enum CognitivePracticeType {
  GUIDED_BREATHING = "GUIDED_BREATHING",
  GUIDED_MEDITATION = "GUIDED_MEDITATION",
  REFRAMING_THOUGHTS = "REFRAMING_THOUGHTS",
  REAL_LIFE_CHALLENGE = "REAL_LIFE_CHALLENGE",
  MIRROR_WORK = "MIRROR_WORK",
}

export interface GuidedBreathingData {
  tips: Array<string>;
  durationMinutes: number;
}

export interface GuidedMeditationData {
  audioUrlKey: string;
  bgMusicUrl: string;
  durationMinutes: number;
  tips: string[];
  icon: string;
}

export interface ReframingThoughtScenarioData {
  negativeThought: string;
  reframedThoughts: string[];
}

export interface ReframingThoughtsData {
  scenarios: ReframingThoughtScenarioData[];
}

export interface CognitivePractice {
  id: string;
  type: CognitivePracticeType;
  name: string;
  description: string;
  difficulty: DifficultyLevel;
  guidedBreathingData?: GuidedBreathingData;
  guidedMeditationData?: GuidedMeditationData;
  reframingThoughtsData?: ReframingThoughtsData;
  realLifeChallengeData?: CognitiveRealLifeData; // For REAL_LIFE_CHALLENGE type
}

//////////// Exposure Practice

export enum ExposurePracticeType {
  // RANDOM_QUESTIONS = "RANDOM_QUESTIONS", // Uppercase values
  INTERVIEW_SIMULATION = "INTERVIEW",
  PHONE_CALL_SIMULATION = "PHONE_CALL",
  SOCIAL_CHALLENGE_SIMULATION = "SOCIAL_CHALLENGE",
  REAL_LIFE_CHALLENGE = "REAL_LIFE_CHALLENGE",
  // DATING_CONVERSATION = "DATING_CONVERSATION",
  // GIVING_DIRECTIONS = "GIVING_DIRECTIONS",
  // Add other exposure types as needed
}

export interface FixedRolePlayNodeOption {
  id: string;
  userLine: string;
  nextNodeId: string | null;
}

export interface FixedRolePlayNode {
  id: string;
  npcLine: string;
  options: FixedRolePlayNodeOption[];
}

export interface FixedRolePlayStageBase {
  npcRole: string;
  userRole: string;
  userCharacter: string[];
  initialNodeId: string;
  dialogues: Record<string, FixedRolePlayNode>;
}

export interface AvailableExposureFixedRolePlayRole {
  roleName: string;
  roleDescription: string;
  fontAwesomeIcon: string;
}

export interface FixedRolePlayScenario {
  tips: string[];
  duration: number;
  availableRole: AvailableExposureFixedRolePlayRole;
  scenarioDetails: string;
}

export interface FixedRolePlayData {
  stage: FixedRolePlayStageBase;
  scenario: FixedRolePlayScenario;
}

// Real-Life Challenge data (for pack-based activities)
// Real-Life Challenge data (for pack-based activities)
export enum ExposureRealLifeCategory {
  SOCIAL_DRILL = "SOCIAL_DRILL",
  TECHNIQUE_DRILL = "TECHNIQUE_DRILL",
}

export interface ExposureRealLifeData {
  category: ExposureRealLifeCategory;
  instructions: string;
  encouragement: string;
  completionCriteria: string;
  completionPlaceholder: string;
  xpReward?: number;
  durationMinutes?: number;
}

export enum CognitiveRealLifeCategory {
  MINDFULNESS_DRILL = "MINDFULNESS_DRILL",
  INTROSPECTION_DRILL = "INTROSPECTION_DRILL",
}

export interface CognitiveRealLifeData {
  category: CognitiveRealLifeCategory;
  instructions: string;
  encouragement: string;
  completionPlaceholder: string;
  xpReward?: number;
  durationMinutes?: number;
}

export type RealLifeChallengeData =
  | ExposureRealLifeData
  | CognitiveRealLifeData;

export interface ExposurePractice {
  id: string;
  type: ExposurePracticeType;
  name: string;
  description: string;
  difficulty: DifficultyLevel;
  practiceData?: FixedRolePlayData;
  socialChallengeData?: FixedRolePlayData;
  interviewPracticeData?: FixedRolePlayData;
  phoneCallData?: {
    agentName: string;
    agentDesignation: string;
    icon: string;
    systemPrompt: string;
  };
  realLifeChallengeData?: ExposureRealLifeData; // For REAL_LIFE_CHALLENGE type
}

// Reading Practice

export enum ReadingPracticeType {
  WORD = "WORD",
  PHRASE = "PHRASE",
  POEM = "POEM",
  STORY = "STORY",
  QUOTE = "QUOTE",
}

export interface ReadingPractice {
  id: string;
  type: ReadingPracticeType;
  title: string;
  author: string;
  difficulty: DifficultyLevel;
  textContent?: string;
}

// Phone Call Scenario

export interface PhoneCallScenario {
  id: string;
  name: string;
  description: string;
  difficulty: DifficultyLevel;
  type: ExposurePracticeType.PHONE_CALL_SIMULATION;
  phoneCallData?: {
    agentName: string;
    agentDesignation: string;
    icon: string;
    systemPrompt: string;
  };
}
