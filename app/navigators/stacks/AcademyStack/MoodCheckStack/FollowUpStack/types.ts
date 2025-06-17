import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";
import { MOOD } from "../../../../../types/mood";

export type MoodFUStackParamList = {
  FollowUp: { mood: MOOD };
  BreathingPractice: undefined;
  MeditationPractice: {
    mood: MOOD;
  };
  ReframePractice: undefined;
  RoleplayPracticeStack: undefined;
  StoryPractice: undefined;
};
export type MoodFUStackNavigationProp<T extends keyof MoodFUStackParamList> =
  NativeStackNavigationProp<MoodFUStackParamList, T>;
export type MoodFUStackRouteProp<T extends keyof MoodFUStackParamList> =
  RouteProp<MoodFUStackParamList, T>;
