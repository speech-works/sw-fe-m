import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";
import { MoodType } from "../../../api/moodCheck/types";

export type AcademyStackParamList = {
  Academy: undefined;
  DailyPracticeStack: undefined;
  LibraryStack: undefined;
  ChallengesStack: undefined;
  ProgressDetailStack: undefined;
  Progress: undefined;
  MoodCheckStack: { screen: "FollowUpStack"; params: { mood: MoodType } };
};
export type AcademyStackNavigationProp<T extends keyof AcademyStackParamList> =
  NativeStackNavigationProp<AcademyStackParamList, T>;
export type AcademyStackRouteProp<T extends keyof AcademyStackParamList> =
  RouteProp<AcademyStackParamList, T>;
