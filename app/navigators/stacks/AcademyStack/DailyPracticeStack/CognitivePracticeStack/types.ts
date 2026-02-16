import { CompositeNavigationProp, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AcademyStackParamList } from "../../types";

export type CDPStackParamList = {
  CognitivePractice: undefined;
  BreathingPractice: {
    packContext?: { packId: string; moduleId: string; blockIndex?: number };
    practiceActivity?: any;
  };
  MeditationPractice: {
    packContext?: { packId: string; moduleId: string; blockIndex?: number };
    practiceActivity?: any;
    mood?: MoodType; // Add optional mood param
  };
  ReframePractice: {
    packContext?: { packId: string; moduleId: string; blockIndex?: number };
    practiceActivity?: any;
  };
};
export type CDPStackNavigationProp<T extends keyof CDPStackParamList> =
  CompositeNavigationProp<
    NativeStackNavigationProp<CDPStackParamList, T>,
    NativeStackNavigationProp<AcademyStackParamList>
  >;
export type CDPStackRouteProp<T extends keyof CDPStackParamList> = RouteProp<
  CDPStackParamList,
  T
>;
