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

/////////// cognitive practice

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
