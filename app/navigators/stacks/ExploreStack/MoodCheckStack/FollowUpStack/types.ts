import { RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MoodType } from "../../../../../api/moodCheck/types";

export type MoodFUStackParamList = {
  FollowUp: { mood: MoodType };
  BreathingPractice: { id?: string };
  MeditationPractice: {
    mood: MoodType;
    id?: string;
  };
  ReframePractice: { id?: string };
  RoleplayPracticeStack: { id?: string };
  ExposurePractice: { id?: string };
  RealLifeChallenge: { id?: string };
  StoryPractice: { id?: string };
  QuotePractice: { id?: string };
  PoemPractice: { id?: string };
  TwisterPracticeStack: { id?: string };
  TwisterExercise: { id: string; from?: "HOME" | "EXPLORE" | "MOOD_CHECK" };
  RoleplayBriefing: {
    id: string;
    from?: "HOME" | "EXPLORE" | "MOOD_CHECK";
    title?: string;
    description?: string;
  };
  CVExercise: { id: string; from?: "HOME" | "EXPLORE" | "MOOD_CHECK" };
  TechniquePage: {
    techniqueId: string;
    techniqueName: string;
    techniqueDesc: string;
    techniqueLevel: string;
    stage: "TUTORIAL" | "EXERCISE";
    hasFree: boolean;
    from?: "HOME" | "EXPLORE" | "MOOD_CHECK";
  };
  SummaryPage: {
    techniqueId: string;
    techniqueName: string;
    finalAnswers: Array<any>;
    from?: "HOME" | "EXPLORE" | "MOOD_CHECK";
  };
};

export type MoodFUStackNavigationProp<T extends keyof MoodFUStackParamList> =
  NativeStackNavigationProp<MoodFUStackParamList, T>;
export type MoodFUStackRouteProp<T extends keyof MoodFUStackParamList> =
  RouteProp<MoodFUStackParamList, T>;
