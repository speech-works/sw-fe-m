import { RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

export type PDStackParamList = {
  ProgressDetail: undefined;
};
export type PDStackNavigationProp<T extends keyof PDStackParamList> =
  NativeStackNavigationProp<PDStackParamList, T>;
export type PDStackRouteProp<T extends keyof PDStackParamList> = RouteProp<
  PDStackParamList,
  T
>;
