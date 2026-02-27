import { RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

export type TwisterFDPStackParamList = {
  TwisterExercise: {
    packContext?: { packId: string; moduleId: string; blockIndex?: number };
    practiceActivity?: any;
  };
};
export type TwisterFDPStackNavigationProp<
  T extends keyof TwisterFDPStackParamList,
> = NativeStackNavigationProp<TwisterFDPStackParamList, T>;
export type TwisterFDPStackRouteProp<T extends keyof TwisterFDPStackParamList> =
  RouteProp<TwisterFDPStackParamList, T>;
