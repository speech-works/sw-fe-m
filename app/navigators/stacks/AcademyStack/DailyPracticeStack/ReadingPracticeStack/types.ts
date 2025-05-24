import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";

export type RDPStackParamList = {
  ReadingPractice: undefined;
  StoriesPractice: undefined;
  PoemsPractice: undefined;
  QuotesPractice: undefined;
};
export type RDPStackNavigationProp<T extends keyof RDPStackParamList> =
  NativeStackNavigationProp<RDPStackParamList, T>;
export type RDPStackRouteProp<T extends keyof RDPStackParamList> = RouteProp<
  RDPStackParamList,
  T
>;
