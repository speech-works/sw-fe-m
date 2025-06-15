import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";
import { MOOD } from "../../../../types/mood";

export type MoodCheckStackParamList = {
  FollowUp: { mood: MOOD };
};
export type MoodCheckStackNavigationProp<
  T extends keyof MoodCheckStackParamList
> = NativeStackNavigationProp<MoodCheckStackParamList, T>;
export type MoodCheckStackRouteProp<T extends keyof MoodCheckStackParamList> =
  RouteProp<MoodCheckStackParamList, T>;
