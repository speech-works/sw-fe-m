import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";
import { LIBRARY_STAGE } from "../../../../screens/Academy/Library/TechniquePage/type";

export type LibStackParamList = {
  Library: undefined;
  TechniquePage: {
    techniqueId: string;
    techniqueName: string;
    stage: LIBRARY_STAGE;
  };
  SummaryPage: {
    techniqueId: string;
    techniqueName: string;
  };
};
export type LibStackNavigationProp<T extends keyof LibStackParamList> =
  NativeStackNavigationProp<LibStackParamList, T>;
export type LibStackRouteProp<T extends keyof LibStackParamList> = RouteProp<
  LibStackParamList,
  T
>;
