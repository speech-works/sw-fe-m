import { CompositeNavigationProp, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ExploreStackParamList } from "../../../types";
import { PackContext } from "../../../../../../utils/packActivityNavigation";

export type PhoneCallEDPStackParamList = {
  PhoneCallScreen: {
    packContext?: PackContext;
    practiceActivity?: any;
    from?: "HOME" | "EXPLORE" | "MOOD_CHECK";
  };
};
export type PhoneCallEDPStackNavigationProp<
  T extends keyof PhoneCallEDPStackParamList,
> = CompositeNavigationProp<
  NativeStackNavigationProp<PhoneCallEDPStackParamList, T>,
  NativeStackNavigationProp<ExploreStackParamList>
>;
export type PhoneCallEDPStackRouteProp<
  T extends keyof PhoneCallEDPStackParamList,
> = RouteProp<PhoneCallEDPStackParamList, T>;
