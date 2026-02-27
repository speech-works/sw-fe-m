import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";
import SubscribeScreen from "../../../screens/Payments";
import { PaymentStackParamList } from "./types";

const Stack = createNativeStackNavigator<PaymentStackParamList>();

export default function PaymentStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Payments" component={SubscribeScreen} />
    </Stack.Navigator>
  );
}
