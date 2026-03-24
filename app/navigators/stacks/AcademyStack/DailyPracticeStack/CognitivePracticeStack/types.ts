import { CompositeNavigationProp, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AcademyStackParamList } from "../../types";
import { MoodType } from "../../../../../api/moodCheck/types";
import { PackContext } from "../../../../../utils/packActivityNavigation";

export type CDPStackParamList = {
  CognitivePractice: undefined;
  BreathingPractice:
    | {
        packContext?: PackContext;
        practiceActivity?: any;
      }
    | undefined;
  MeditationPractice:
    | {
        packContext?: PackContext;
        practiceActivity?: any;
        mood?: MoodType; // Add optional mood param
      }
    | undefined;
  ReframePractice:
    | {
        packContext?: PackContext;
        practiceActivity?: any;
      }
    | undefined;
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
