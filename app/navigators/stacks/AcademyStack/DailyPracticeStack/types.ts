import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";

export type DPStackParamList = {
  DailyPractice: undefined;
  ReadingPracticeStack: undefined;
  FunPracticeStack: undefined;
  CognitivePracticeStack: undefined;
  ExposureStack: undefined;
};
export type DPStackNavigationProp<T extends keyof DPStackParamList> =
  NativeStackNavigationProp<DPStackParamList, T>;
export type DPStackRouteProp<T extends keyof DPStackParamList> = RouteProp<
  DPStackParamList,
  T
>;
