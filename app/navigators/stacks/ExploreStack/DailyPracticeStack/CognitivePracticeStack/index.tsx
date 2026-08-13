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

// ONLY THE VIEWFINDER IS SCHEME-LOCKED.
//
// The session is dark BY DESIGN — dark chrome around a live camera feed, like
// Apple Camera or Instagram — so it ignores the Light/System preference. A
// module-scope wrapper keeps component identity stable across renders.
//
// Reflection and Summary used to be locked too, and painted themselves light
// inside that lock. They are ordinary screens: you have put the phone down and
// are reading. They now follow the appearance preference like everything else,
// so a dark-mode user is not flashed with a bright screen at the end of a
// session. Prep always themed normally.
const DarkMirrorWorkSession: React.FC<React.ComponentProps<typeof MirrorWorkSession>> = (props) => (
  <ForceDark>
    <MirrorWorkSession {...props} />
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
