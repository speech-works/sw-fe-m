import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { CDPStackParamList } from "./types";
import CognitivePractice from "../../../../../screens/Academy/DailyPractice/pages/CognitivePractice";

const Stack = createNativeStackNavigator<CDPStackParamList>();

export default function CDPStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CognitivePractice" component={CognitivePractice} />
    </Stack.Navigator>
  );
}
