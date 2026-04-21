import { RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

export type SBEDPStackParamList = {
  SBScreen: undefined;
};
export type SBEDPStackNavigationProp<T extends keyof SBEDPStackParamList> =
  NativeStackNavigationProp<SBEDPStackParamList, T>;
export type SBEDPStackRouteProp<T extends keyof SBEDPStackParamList> =
  RouteProp<SBEDPStackParamList, T>;
