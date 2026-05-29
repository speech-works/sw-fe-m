import { RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ExposurePractice } from "../../../../../../api/dailyPractice/types";
import { PackContext } from "../../../../../../utils/packActivityNavigation";

export type InterviewEDPStackParamList = {
  InterviewList: undefined;
  InterviewBriefing: {
    interview: ExposurePractice;
    packContext?: PackContext;
    from?: "HOME" | "EXPLORE" | "MOOD_CHECK";
  };
  InterviewChat: {
    interview: ExposurePractice;
    practiceActivityId: string;
    packContext?: PackContext;
    from?: "HOME" | "EXPLORE" | "MOOD_CHECK";
  };
};
export type InterviewEDPStackNavigationProp<
  T extends keyof InterviewEDPStackParamList,
> = NativeStackNavigationProp<InterviewEDPStackParamList, T>;
export type InterviewEDPStackRouteProp<
  T extends keyof InterviewEDPStackParamList,
> = RouteProp<InterviewEDPStackParamList, T>;
