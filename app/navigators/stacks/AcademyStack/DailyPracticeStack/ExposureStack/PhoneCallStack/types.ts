import { CompositeNavigationProp, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AcademyStackParamList } from "../../../types";

export type PhoneCallEDPStackParamList = {
  PhoneCallScreen: {
    packContext?: { packId: string; moduleId: string; blockIndex?: number };
    practiceActivity?: any;
  };
};
export type PhoneCallEDPStackNavigationProp<
  T extends keyof PhoneCallEDPStackParamList,
> = CompositeNavigationProp<
  NativeStackNavigationProp<PhoneCallEDPStackParamList, T>,
  NativeStackNavigationProp<AcademyStackParamList>
>;
export type PhoneCallEDPStackRouteProp<
  T extends keyof PhoneCallEDPStackParamList,
> = RouteProp<PhoneCallEDPStackParamList, T>;
