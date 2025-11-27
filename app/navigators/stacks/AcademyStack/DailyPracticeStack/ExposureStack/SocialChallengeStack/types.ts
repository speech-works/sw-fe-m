import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";
import { ExposurePractice } from "../../../../../../api/dailyPractice/types";

export type SCEDPStackParamList = {
  SCList: undefined;
  SCBriefing: {
    sc: ExposurePractice;
  };
  SCChat: {
    sc: ExposurePractice;
    practiceActivityId: string;
  };
};
export type SCEDPStackNavigationProp<T extends keyof SCEDPStackParamList> =
  NativeStackNavigationProp<SCEDPStackParamList, T>;
export type SCEDPStackRouteProp<T extends keyof SCEDPStackParamList> =
  RouteProp<SCEDPStackParamList, T>;
