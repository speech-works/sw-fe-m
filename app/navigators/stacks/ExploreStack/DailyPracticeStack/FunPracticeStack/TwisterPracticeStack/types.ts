import { CompositeNavigationProp, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { PackContext } from "../../../../../../utils/packActivityNavigation";
import { ExploreStackParamList } from "../../../types";

export type TwisterFDPStackParamList = {
  TwisterExercise: {
    packContext?: PackContext;
    practiceActivity?: any;
    from?: "HOME" | "EXPLORE" | "MOOD_CHECK";
    id?: string;
  };
};
export type TwisterFDPStackNavigationProp<
  T extends keyof TwisterFDPStackParamList,
> = CompositeNavigationProp<
  NativeStackNavigationProp<TwisterFDPStackParamList, T>,
  NativeStackNavigationProp<ExploreStackParamList>
>;
export type TwisterFDPStackRouteProp<T extends keyof TwisterFDPStackParamList> =
  RouteProp<TwisterFDPStackParamList, T>;
