import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";
import { MoodType } from "../../../../../api/moodCheck/types";

export type MoodFUStackParamList = {
  FollowUp: { mood: MoodType };
  BreathingPractice: undefined;
  MeditationPractice: {
    mood: MoodType;
  };
  ReframePractice: undefined;
  RoleplayPracticeStack: undefined;
  StoryPractice: undefined;
};
export type MoodFUStackNavigationProp<T extends keyof MoodFUStackParamList> =
  NativeStackNavigationProp<MoodFUStackParamList, T>;
export type MoodFUStackRouteProp<T extends keyof MoodFUStackParamList> =
  RouteProp<MoodFUStackParamList, T>;
