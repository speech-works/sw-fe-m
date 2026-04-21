import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";

import Exposure from "../../../../../screens/Academy/DailyPractice/pages/Exposure";
import InterviewEDPStackNavigator from "./InterviewSimulationStack";
import SBEDPStackNavigator from "./SecondaryBehaviorsStack";
import SCEDPStackNavigator from "./SocialChallengeStack";
import PhoneCallEDPStackNavigator from "./PhoneCallStack";
import { EDPStackParamList } from "./types";

const Stack = createNativeStackNavigator<EDPStackParamList>();

export default function EDPStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Exposure" component={Exposure} />
      <Stack.Screen
        name="SocialChallengeStack"
        component={SCEDPStackNavigator}
      />
      <Stack.Screen
        name="InterviewSimulationStack"
        component={InterviewEDPStackNavigator}
      />
      <Stack.Screen name="PhoneCallStack" component={PhoneCallEDPStackNavigator} />
      <Stack.Screen
        name="SecondaryBehaviorsStack"
        component={SBEDPStackNavigator}
      />
    </Stack.Navigator>
  );
}
