import { RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ExposurePractice } from "../../../../../../api/dailyPractice/types";
import { PackContext } from "../../../../../../utils/packActivityNavigation";

export type SCEDPStackParamList = {
  SCList: undefined;
  SCBriefing: {
    sc: ExposurePractice;
    packContext?: PackContext;
    from?: "HOME" | "EXPLORE" | "MOOD_CHECK";
  };
  SCChat: {
    sc: ExposurePractice;
    practiceActivityId: string;
    packContext?: PackContext;
    from?: "HOME" | "EXPLORE" | "MOOD_CHECK";
  };
};
export type SCEDPStackNavigationProp<T extends keyof SCEDPStackParamList> =
  NativeStackNavigationProp<SCEDPStackParamList, T>;
export type SCEDPStackRouteProp<T extends keyof SCEDPStackParamList> =
  RouteProp<SCEDPStackParamList, T>;
