import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";

export type TwisterFDPStackParamList = {
  TwisterExercise: undefined;
};
export type TwisterFDPStackNavigationProp<
  T extends keyof TwisterFDPStackParamList
> = NativeStackNavigationProp<TwisterFDPStackParamList, T>;
export type TwisterFDPStackRouteProp<T extends keyof TwisterFDPStackParamList> =
  RouteProp<TwisterFDPStackParamList, T>;
