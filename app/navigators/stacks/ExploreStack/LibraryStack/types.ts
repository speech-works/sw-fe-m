import { RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { FinalAnswer, TECHNIQUES_ENUM } from "../../../../api/library/types";
import { LIBRARY_STAGE } from "../../../../screens/Academy/Library/TechniquePage/type";

export type LibStackParamList = {
  Library: { from?: "HOME" | "EXPLORE" | "MOOD_CHECK" } | undefined;
  TechniquePage: {
    techniqueId: TECHNIQUES_ENUM;
    techniqueDesc: string;
    techniqueLevel: string;
    techniqueName: string;
    stage: LIBRARY_STAGE;
    hasFree: boolean;
    from?: "HOME" | "EXPLORE" | "MOOD_CHECK";
  };
  SummaryPage: {
    techniqueId: TECHNIQUES_ENUM;
    techniqueName: string;
    finalAnswers: Array<FinalAnswer>;
    from?: "HOME" | "EXPLORE" | "MOOD_CHECK";
  };
  PaymentStack: undefined;
};
export type LibStackNavigationProp<T extends keyof LibStackParamList> =
  NativeStackNavigationProp<LibStackParamList, T>;
export type LibStackRouteProp<T extends keyof LibStackParamList> = RouteProp<
  LibStackParamList,
  T
>;
