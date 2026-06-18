import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";

import CognitivePractice from "../../../../../screens/Academy/DailyPractice/pages/CognitivePractice";
import Breathing from "../../../../../screens/Academy/DailyPractice/pages/CognitivePractice/Breathing";
import Meditation from "../../../../../screens/Academy/DailyPractice/pages/CognitivePractice/Meditation";
import Reframe from "../../../../../screens/Academy/DailyPractice/pages/CognitivePractice/Reframe";
import { PrepScreen as MirrorWorkPrep } from "../../../../../screens/Academy/DailyPractice/pages/MirrorWork/PrepScreen";
import { SessionScreen as MirrorWorkSession } from "../../../../../screens/Academy/DailyPractice/pages/MirrorWork/SessionScreen";
import { ReflectionScreen as MirrorWorkReflection } from "../../../../../screens/Academy/DailyPractice/pages/MirrorWork/ReflectionScreen";
import { SummaryScreen as MirrorWorkSummary } from "../../../../../screens/Academy/DailyPractice/pages/MirrorWork/SummaryScreen";
import { CDPStackParamList } from "./types";

const Stack = createNativeStackNavigator<CDPStackParamList>();

export default function CDPStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CognitivePractice" component={CognitivePractice} />
      <Stack.Screen
        name="ReframePractice"
        component={Reframe}
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen
        name="BreathingPractice"
        component={Breathing}
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen
        name="MeditationPractice"
        component={Meditation}
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen name="MirrorWorkPrep" component={MirrorWorkPrep} />
      <Stack.Screen
        name="MirrorWorkSession"
        component={MirrorWorkSession}
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen
        name="MirrorWorkReflection"
        component={MirrorWorkReflection}
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen
        name="MirrorWorkSummary"
        component={MirrorWorkSummary}
        options={{ gestureEnabled: false }}
      />
    </Stack.Navigator>
  );
}
