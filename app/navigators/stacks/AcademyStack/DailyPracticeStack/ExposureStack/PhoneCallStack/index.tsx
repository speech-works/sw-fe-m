import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { PhoneCallEDPStackParamList } from "./types";
import PhoneCall from "../../../../../../screens/Academy/DailyPractice/pages/Exposure/PhoneCall";

const Stack = createNativeStackNavigator<PhoneCallEDPStackParamList>();

export default function PhoneCallEDPStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="PhoneCallScreen" component={PhoneCall} />
    </Stack.Navigator>
  );
}
