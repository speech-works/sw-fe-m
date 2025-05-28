import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";

export type InterviewEDPStackParamList = {
  InterviewList: undefined;
  InterviewBriefing: {
    interviewTitle: string;
    interviewDescription: string;
    yourCharacter: string[];
  };
  InterviewChat: {
    interviewTitle: string;
  };
};
export type InterviewEDPStackNavigationProp<
  T extends keyof InterviewEDPStackParamList
> = NativeStackNavigationProp<InterviewEDPStackParamList, T>;
export type InterviewEDPStackRouteProp<
  T extends keyof InterviewEDPStackParamList
> = RouteProp<InterviewEDPStackParamList, T>;
