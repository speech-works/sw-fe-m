import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";

export type FDPStackParamList = {
  FunPractice: undefined;
  RoleplayPracticeStack: undefined;
  TwisterPracticeStack: undefined;
  CharacterVoicePracticeStack: undefined;
};
export type FDPStackNavigationProp<T extends keyof FDPStackParamList> =
  NativeStackNavigationProp<FDPStackParamList, T>;
export type FDPStackRouteProp<T extends keyof FDPStackParamList> = RouteProp<
  FDPStackParamList,
  T
>;
