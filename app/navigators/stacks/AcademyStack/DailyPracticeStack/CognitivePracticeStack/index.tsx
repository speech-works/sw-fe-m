import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { CDPStackParamList } from "./types";
import CognitivePractice from "../../../../../screens/Academy/DailyPractice/pages/CognitivePractice";
import Reframe from "../../../../../screens/Academy/DailyPractice/pages/CognitivePractice/Reframe";

const Stack = createNativeStackNavigator<CDPStackParamList>();

export default function CDPStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CognitivePractice" component={CognitivePractice} />
      <Stack.Screen name="ReframePractice" component={Reframe} />
    </Stack.Navigator>
  );
}
