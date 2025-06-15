import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";
import { MOOD } from "../../../types/mood";

export type AcademyStackParamList = {
  Academy: undefined;
  DailyPracticeStack: undefined;
  LibraryStack: undefined;
  ChallengesStack: undefined;
  Progress: undefined;
  MoodCheckStack: { screen: "FollowUp"; params: { mood: MOOD } };
};
export type AcademyStackNavigationProp<T extends keyof AcademyStackParamList> =
  NativeStackNavigationProp<AcademyStackParamList, T>;
export type AcademyStackRouteProp<T extends keyof AcademyStackParamList> =
  RouteProp<AcademyStackParamList, T>;
