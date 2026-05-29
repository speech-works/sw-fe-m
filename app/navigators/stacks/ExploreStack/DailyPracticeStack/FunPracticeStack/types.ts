import { CompositeNavigationProp, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ExploreStackParamList } from "../../types";

export type FDPStackParamList = {
  FunPractice: undefined;
  RoleplayPracticeStack: undefined;
  TwisterPracticeStack: undefined;
  CharacterVoicePracticeStack: undefined;
};
export type FDPStackNavigationProp<T extends keyof FDPStackParamList> =
  CompositeNavigationProp<
    NativeStackNavigationProp<FDPStackParamList, T>,
    NativeStackNavigationProp<ExploreStackParamList>
  >;
export type FDPStackRouteProp<T extends keyof FDPStackParamList> = RouteProp<
  FDPStackParamList,
  T
>;
