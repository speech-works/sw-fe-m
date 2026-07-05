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
import { ForceDark } from "../../../../../design-system";
import { CDPStackParamList } from "./types";

// Scheme-locked dark — camera surfaces. The MirrorWork session flow is dark BY
// DESIGN (dark chrome around a live viewfinder, like Apple Camera/Instagram),
// so it ignores the Light/System appearance preference. Module-scope wrappers
// keep component identity stable across renders. Prep is a normal DS screen
// and themes normally.
const DarkMirrorWorkSession: React.FC<React.ComponentProps<typeof MirrorWorkSession>> = (props) => (
  <ForceDark>
    <MirrorWorkSession {...props} />
  </ForceDark>
);
const DarkMirrorWorkReflection: React.FC<React.ComponentProps<typeof MirrorWorkReflection>> = (props) => (
  <ForceDark>
    <MirrorWorkReflection {...props} />
  </ForceDark>
);
const DarkMirrorWorkSummary: React.FC<React.ComponentProps<typeof MirrorWorkSummary>> = (props) => (
  <ForceDark>
    <MirrorWorkSummary {...props} />
  </ForceDark>
);

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
        component={DarkMirrorWorkSession}
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen
        name="MirrorWorkReflection"
        component={DarkMirrorWorkReflection}
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen
        name="MirrorWorkSummary"
        component={DarkMirrorWorkSummary}
        options={{ gestureEnabled: false }}
      />
    </Stack.Navigator>
  );
}
