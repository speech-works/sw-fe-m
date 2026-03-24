import { RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ExposurePractice } from "../../../../../../api/dailyPractice/types";
import { PackContext } from "../../../../../../utils/packActivityNavigation";

export type InterviewEDPStackParamList = {
  InterviewList: undefined;
  InterviewBriefing: {
    interview: ExposurePractice;
    packContext?: PackContext;
  };
  InterviewChat: {
    interview: ExposurePractice;
    practiceActivityId: string;
    packContext?: PackContext;
  };
};
export type InterviewEDPStackNavigationProp<
  T extends keyof InterviewEDPStackParamList,
> = NativeStackNavigationProp<InterviewEDPStackParamList, T>;
export type InterviewEDPStackRouteProp<
  T extends keyof InterviewEDPStackParamList,
> = RouteProp<InterviewEDPStackParamList, T>;
