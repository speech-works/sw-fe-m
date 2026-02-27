import { RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MoodType } from "../../../api/moodCheck/types";

export type ExploreStackParamList = {
  Explore: undefined;
  DailyPracticeStack: undefined;
  LibraryStack: undefined;
  ChallengesStack: undefined;
  ProgressDetailStack: undefined;
  PaymentStack: undefined;
  // MoodCheck might be needed if tiles link to it, even if not on main screen
  MoodCheckStack: { screen: "FollowUpStack"; params: { mood: MoodType } };
};

export type ExploreStackNavigationProp<T extends keyof ExploreStackParamList> =
  NativeStackNavigationProp<ExploreStackParamList, T>;

export type ExploreStackRouteProp<T extends keyof ExploreStackParamList> =
  RouteProp<ExploreStackParamList, T>;
