import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";
import { DPStackParamList } from "./types";

import CDPStackNavigator from "./CognitivePracticeStack";
import EDPStackNavigator from "./ExposureStack";
import FDPStackNavigator from "./FunPracticeStack";
import RDPStackNavigator from "./ReadingPracticeStack";

const Stack = createNativeStackNavigator<DPStackParamList>();

/*
 * NO "DailyPractice" SCREEN HERE ANY MORE.
 *
 * It used to be this stack's first route and nothing could open it. Every
 * caller navigates in with a `screen` param that lands on one of the sub-stacks
 * below, and with no `initialRouteName` set on the navigator, React Navigation
 * never seeded it underneath, so even Back skipped past it. Verified on device
 * rather than assumed.
 *
 * It also listed the same four practice types Explore already shows, so it was
 * a duplicate as well as an unreachable one. Deleted 2026-08-22 along with the
 * Today strip, which only ever rendered inside it.
 */
export default function DPStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ReadingPracticeStack" component={RDPStackNavigator} />
      <Stack.Screen name="FunPracticeStack" component={FDPStackNavigator} />
      <Stack.Screen
        name="CognitivePracticeStack"
        component={CDPStackNavigator}
      />
      <Stack.Screen name="ExposureStack" component={EDPStackNavigator} />

      {/* Impact Assessment Flow */}


    </Stack.Navigator>
  );
}
