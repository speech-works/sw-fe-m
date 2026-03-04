import { CompositeNavigationProp, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AcademyStackParamList } from "../../types";

export type TwisterFDPStackParamList = {
  TwisterExercise: {
    packContext?: { packId: string; moduleId: string; blockIndex?: number };
    practiceActivity?: any;
  };
};
export type TwisterFDPStackNavigationProp<
  T extends keyof TwisterFDPStackParamList,
> = CompositeNavigationProp<
  NativeStackNavigationProp<TwisterFDPStackParamList, T>,
  NativeStackNavigationProp<AcademyStackParamList>
>;
export type TwisterFDPStackRouteProp<T extends keyof TwisterFDPStackParamList> =
  RouteProp<TwisterFDPStackParamList, T>;
