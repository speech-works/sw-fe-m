import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";

export type ChalStackParamList = {
  Challenges: undefined;
};
export type ChalStackNavigationProp<T extends keyof ChalStackParamList> =
  NativeStackNavigationProp<ChalStackParamList, T>;
export type ChalStackRouteProp<T extends keyof ChalStackParamList> = RouteProp<
  ChalStackParamList,
  T
>;
