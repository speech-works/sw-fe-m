import { RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

export type PaymentStackParamList = {
  Payments: undefined;
};
export type PaymentStackNavigationProp<T extends keyof PaymentStackParamList> =
  NativeStackNavigationProp<PaymentStackParamList, T>;
export type PaymentStackRouteProp<T extends keyof PaymentStackParamList> =
  RouteProp<PaymentStackParamList, T>;
