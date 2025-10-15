import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { EDPStackParamList } from "./types";
import Exposure from "../../../../../screens/Academy/DailyPractice/pages/Exposure";
import InterviewEDPStackNavigator from "./InterviewSimulationStack";
import PhoneCallEDPStackNavigator from "./PhoneCallStack";
import SBEDPStackNavigator from "./SecondaryBehaviorsStack";

const Stack = createNativeStackNavigator<EDPStackParamList>();

export default function EDPStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Exposure" component={Exposure} />
      <Stack.Screen
        name="InterviewSimulationStack"
        component={InterviewEDPStackNavigator}
      />
      <Stack.Screen
        name="PhoneCallsStack"
        component={PhoneCallEDPStackNavigator}
      />
      <Stack.Screen
        name="SecondaryBehaviorsStack"
        component={SBEDPStackNavigator}
      />
    </Stack.Navigator>
  );
}
