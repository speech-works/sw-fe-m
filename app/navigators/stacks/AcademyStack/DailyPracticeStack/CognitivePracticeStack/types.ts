import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";

export type CDPStackParamList = {
  CognitivePractice: undefined;
  BreathingPractice: undefined;
  MeditationPractice: undefined;
  ReframePractice: undefined;
};
export type CDPStackNavigationProp<T extends keyof CDPStackParamList> =
  NativeStackNavigationProp<CDPStackParamList, T>;
export type CDPStackRouteProp<T extends keyof CDPStackParamList> = RouteProp<
  CDPStackParamList,
  T
>;
