import { RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ExposurePractice } from "../../../../../../api/dailyPractice/types";

export type SCEDPStackParamList = {
  SCList: undefined;
  SCBriefing: {
    sc: ExposurePractice;
    packContext?: { packId: string; moduleId: string; blockIndex?: number };
  };
  SCChat: {
    sc: ExposurePractice;
    practiceActivityId: string;
    packContext?: { packId: string; moduleId: string; blockIndex?: number };
  };
};
export type SCEDPStackNavigationProp<T extends keyof SCEDPStackParamList> =
  NativeStackNavigationProp<SCEDPStackParamList, T>;
export type SCEDPStackRouteProp<T extends keyof SCEDPStackParamList> =
  RouteProp<SCEDPStackParamList, T>;
