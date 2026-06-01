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
      <Stack.Screen name="ReframePractice" component={Reframe} />
      <Stack.Screen name="BreathingPractice" component={Breathing} />
      <Stack.Screen name="MeditationPractice" component={Meditation} />
      <Stack.Screen name="MirrorWorkPrep" component={MirrorWorkPrep} />
      <Stack.Screen name="MirrorWorkSession" component={MirrorWorkSession} />
      <Stack.Screen name="MirrorWorkReflection" component={MirrorWorkReflection} />
      <Stack.Screen name="MirrorWorkSummary" component={MirrorWorkSummary} />
    </Stack.Navigator>
  );
}
