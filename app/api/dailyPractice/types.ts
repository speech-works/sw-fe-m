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
  POSITIVE_AFFIRMATIONS = "POSITIVE_AFFIRMATIONS",
  GUIDED_MEDITATION = "GUIDED_MEDITATION",
  REFRAMING_THOUGHTS = "REFRAMING_THOUGHTS",
}

export interface GuidedBreathingData {
  tips: Array<string>;
  durationMinutes: number;
}

export interface PositiveAffirmationsData {
  affirmations: Array<string>;
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
  positiveAffirmationsData?: PositiveAffirmationsData;
  guidedMeditationData?: GuidedMeditationData;
  reframingThoughtsData?: ReframingThoughtsData;
}

//////////// Exposure Practice

export enum ExposurePracticeType {
  // RANDOM_QUESTIONS = "RANDOM_QUESTIONS", // Uppercase values
  INTERVIEW_SIMULATION = "INTERVIEW_SIMULATION",
  PHONE_CALL_SIMULATION = "PHONE_CALL_SIMULATION",
  // DATING_CONVERSATION = "DATING_CONVERSATION",
  // GIVING_DIRECTIONS = "GIVING_DIRECTIONS",
  // Add other exposure types as needed
}

export interface InterviewPracticeNodeOption {
  id: string;
  userLine: string;
  nextNodeId: string | null;
}

export interface InterviewPracticeNode {
  id: string;
  npcLine: string;
  options: InterviewPracticeNodeOption[];
}

export interface InterviewPracticeStageBase {
  npcRole: string;
  userRole: string;
  userCharacter: string[];
  initialNodeId: string;
  dialogues: Record<string, InterviewPracticeNode>;
}

export interface AvailableExposureInterviewRole {
  roleName: string;
  roleDescription: string;
  fontAwesomeIcon: string;
}

export interface InterviewPracticeScenario {
  tips: string[];
  duration: number;
  availableRole: AvailableExposureInterviewRole;
  scenarioDetails: string;
}

export interface InterviewPracticeData {
  stage: InterviewPracticeStageBase;
  scenario: InterviewPracticeScenario;
}

export interface ExposurePractice {
  id: string;
  type: ExposurePracticeType;
  name: string;
  description: string;
  difficulty: DifficultyLevel;
  interviewPracticeData?: InterviewPracticeData;
}

// Reading Practice

export enum ReadingPracticeType {
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
  icon: string;
  description: string;
  difficulty: DifficultyLevel;
  type: ExposurePracticeType.PHONE_CALL_SIMULATION;
  agent: {
    name: string;
    designation: string;
  };
}
