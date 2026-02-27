import { RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ExposurePractice } from "../../../../../../api/dailyPractice/types";

export type InterviewEDPStackParamList = {
  InterviewList: undefined;
  InterviewBriefing: {
    interview: ExposurePractice;
    packContext?: { packId: string; moduleId: string; blockIndex?: number };
  };
  InterviewChat: {
    interview: ExposurePractice;
    practiceActivityId: string;
    packContext?: { packId: string; moduleId: string; blockIndex?: number };
  };
};
export type InterviewEDPStackNavigationProp<
  T extends keyof InterviewEDPStackParamList,
> = NativeStackNavigationProp<InterviewEDPStackParamList, T>;
export type InterviewEDPStackRouteProp<
  T extends keyof InterviewEDPStackParamList,
> = RouteProp<InterviewEDPStackParamList, T>;
