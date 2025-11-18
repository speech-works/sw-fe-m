import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";
import { LIBRARY_STAGE } from "../../../../screens/Academy/Library/TechniquePage/type";
import { FinalAnswer, TECHNIQUES_ENUM } from "../../../../api/library/types";

export type LibStackParamList = {
  Library: undefined;
  TechniquePage: {
    techniqueId: TECHNIQUES_ENUM;
    techniqueDesc: string;
    techniqueLevel: string;
    techniqueName: string;
    stage: LIBRARY_STAGE;
    hasFree: boolean;
  };
  SummaryPage: {
    techniqueId: TECHNIQUES_ENUM;
    techniqueName: string;
    finalAnswers: Array<FinalAnswer>;
  };
  PaymentStack: undefined;
};
export type LibStackNavigationProp<T extends keyof LibStackParamList> =
  NativeStackNavigationProp<LibStackParamList, T>;
export type LibStackRouteProp<T extends keyof LibStackParamList> = RouteProp<
  LibStackParamList,
  T
>;
