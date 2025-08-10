import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { PaymentStackParamList } from "./types";
import SubscribeScreen from "../../../screens/Payments";

const Stack = createNativeStackNavigator<PaymentStackParamList>();

export default function PaymentStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Payments" component={SubscribeScreen} />
    </Stack.Navigator>
  );
}
