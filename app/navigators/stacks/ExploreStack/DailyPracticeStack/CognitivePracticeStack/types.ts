import { CompositeNavigationProp, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ExploreStackParamList } from "../../types";
import { MoodType } from "../../../../../api/moodCheck/types";
import { PackContext } from "../../../../../utils/packActivityNavigation";

export type CDPStackParamList = {
  CognitivePractice: undefined;
  BreathingPractice:
    | {
        packContext?: PackContext;
        practiceActivity?: any;
        from?: "HOME" | "EXPLORE" | "MOOD_CHECK";
      }
    | undefined;
  MeditationPractice:
    | {
        packContext?: PackContext;
        practiceActivity?: any;
        mood?: MoodType; // Add optional mood param
        from?: "HOME" | "EXPLORE" | "MOOD_CHECK";
      }
    | undefined;
  ReframePractice:
    | {
        packContext?: PackContext;
        practiceActivity?: any;
        from?: "HOME" | "EXPLORE" | "MOOD_CHECK";
      }
    | undefined;
  MirrorWorkPrep:
    | { practiceData?: any; packContext?: PackContext; practiceActivity?: any }
    | undefined;
  MirrorWorkSession:
    | { prompts: any; practiceActivityId?: string; packContext?: PackContext }
    | undefined;
  MirrorWorkReflection: { scores: any; promptsAttempted: number; nudgeMode: string; sessionDurationSeconds: number; signalCounts: any; practiceActivityId?: string; weightTableVersion?: number; packContext?: PackContext } | undefined;
  MirrorWorkSummary: { scores: any; promptsAttempted: number; nudgeMode: string; sessionDurationSeconds: number; signalCounts: any; reflectionText: string; practiceActivityId?: string; weightTableVersion?: number; packContext?: PackContext } | undefined;
};
export type CDPStackNavigationProp<T extends keyof CDPStackParamList> =
  CompositeNavigationProp<
    NativeStackNavigationProp<CDPStackParamList, T>,
    NativeStackNavigationProp<ExploreStackParamList>
  >;
export type CDPStackRouteProp<T extends keyof CDPStackParamList> = RouteProp<
  CDPStackParamList,
  T
>;
