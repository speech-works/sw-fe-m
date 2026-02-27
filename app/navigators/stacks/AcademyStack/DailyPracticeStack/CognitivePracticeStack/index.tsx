import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";

import CognitivePractice from "../../../../../screens/Academy/DailyPractice/pages/CognitivePractice";
import Breathing from "../../../../../screens/Academy/DailyPractice/pages/CognitivePractice/Breathing";
import Meditation from "../../../../../screens/Academy/DailyPractice/pages/CognitivePractice/Meditation";
import Reframe from "../../../../../screens/Academy/DailyPractice/pages/CognitivePractice/Reframe";
import { CDPStackParamList } from "./types";

const Stack = createNativeStackNavigator<CDPStackParamList>();

export default function CDPStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CognitivePractice" component={CognitivePractice} />
      <Stack.Screen name="ReframePractice" component={Reframe} />
      <Stack.Screen name="BreathingPractice" component={Breathing} />
      <Stack.Screen name="MeditationPractice" component={Meditation} />
    </Stack.Navigator>
  );
}
