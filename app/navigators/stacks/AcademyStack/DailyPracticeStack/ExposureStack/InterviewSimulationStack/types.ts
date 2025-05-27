import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";

export type InterviewEDPStackParamList = {
  InterviewList: undefined;
  InterviewBriefing: undefined;
  InterviewChat: undefined;
};
export type InterviewEDPStackNavigationProp<
  T extends keyof InterviewEDPStackParamList
> = NativeStackNavigationProp<InterviewEDPStackParamList, T>;
export type InterviewEDPStackRouteProp<
  T extends keyof InterviewEDPStackParamList
> = RouteProp<InterviewEDPStackParamList, T>;
