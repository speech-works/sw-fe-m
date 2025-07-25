import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";
import { MoodType } from "../../../../api/moodCheck/types";

export type MoodCheckStackParamList = {
  FollowUpStack: { mood: MoodType };
};
export type MoodCheckStackNavigationProp<
  T extends keyof MoodCheckStackParamList
> = NativeStackNavigationProp<MoodCheckStackParamList, T>;
export type MoodCheckStackRouteProp<T extends keyof MoodCheckStackParamList> =
  RouteProp<MoodCheckStackParamList, T>;
