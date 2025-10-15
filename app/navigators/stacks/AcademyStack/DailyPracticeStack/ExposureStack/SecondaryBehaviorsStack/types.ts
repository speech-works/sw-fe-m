import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";

export type SBEDPStackParamList = {
  SBScreen: undefined;
};
export type SBEDPStackNavigationProp<T extends keyof SBEDPStackParamList> =
  NativeStackNavigationProp<SBEDPStackParamList, T>;
export type SBEDPStackRouteProp<T extends keyof SBEDPStackParamList> =
  RouteProp<SBEDPStackParamList, T>;
