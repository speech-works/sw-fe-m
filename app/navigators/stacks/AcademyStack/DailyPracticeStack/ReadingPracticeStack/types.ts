import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";

export type RDPStackParamList = {
  ReadingPractice: undefined;
  StoryPractice: undefined;
  PoemPractice: undefined;
  QuotePractice: undefined;
};
export type RDPStackNavigationProp<T extends keyof RDPStackParamList> =
  NativeStackNavigationProp<RDPStackParamList, T>;
export type RDPStackRouteProp<T extends keyof RDPStackParamList> = RouteProp<
  RDPStackParamList,
  T
>;
