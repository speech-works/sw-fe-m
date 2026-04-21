import { RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

export type DPStackParamList = {
  DailyPractice: undefined;
  ReadingPracticeStack: undefined;
  FunPracticeStack: undefined;
  CognitivePracticeStack: undefined;
  ExposureStack: undefined;
  // Impact Assessment
  ImpactAssessmentIntro: undefined;
  ImpactAssessmentQuestions: undefined;
  ImpactAssessmentComplete: undefined;
};
export type DPStackNavigationProp<T extends keyof DPStackParamList> =
  NativeStackNavigationProp<DPStackParamList, T>;
export type DPStackRouteProp<T extends keyof DPStackParamList> = RouteProp<
  DPStackParamList,
  T
>;
