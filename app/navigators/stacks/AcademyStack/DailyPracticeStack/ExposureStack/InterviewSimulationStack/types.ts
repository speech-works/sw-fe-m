import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";
import { ExposurePractice } from "../../../../../../api/dailyPractice/types";

export type InterviewEDPStackParamList = {
  InterviewList: undefined;
  InterviewBriefing: {
    interview: ExposurePractice;
  };
  InterviewChat: {
    interview: ExposurePractice;
    practiceActivityId: string;
  };
};
export type InterviewEDPStackNavigationProp<
  T extends keyof InterviewEDPStackParamList
> = NativeStackNavigationProp<InterviewEDPStackParamList, T>;
export type InterviewEDPStackRouteProp<
  T extends keyof InterviewEDPStackParamList
> = RouteProp<InterviewEDPStackParamList, T>;
