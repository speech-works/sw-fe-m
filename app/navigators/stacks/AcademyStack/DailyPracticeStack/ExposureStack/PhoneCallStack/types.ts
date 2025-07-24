import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";

export type PhoneCallEDPStackParamList = {
  PhoneCallScreen: undefined;
};
export type PhoneCallEDPStackNavigationProp<
  T extends keyof PhoneCallEDPStackParamList
> = NativeStackNavigationProp<PhoneCallEDPStackParamList, T>;
export type PhoneCallEDPStackRouteProp<
  T extends keyof PhoneCallEDPStackParamList
> = RouteProp<PhoneCallEDPStackParamList, T>;
