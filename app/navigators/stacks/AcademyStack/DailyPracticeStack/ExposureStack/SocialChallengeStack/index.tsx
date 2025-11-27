import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { SCEDPStackParamList } from "./types";
import SocialChallenge from "../../../../../../screens/Academy/DailyPractice/pages/Exposure/SocialChallenge";
import Briefing from "../../../../../../screens/Academy/DailyPractice/pages/Exposure/SocialChallenge/Briefing";
import Chat from "../../../../../../screens/Academy/DailyPractice/pages/Exposure/SocialChallenge/Chat";

const Stack = createNativeStackNavigator<SCEDPStackParamList>();

export default function SCEDPStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SCList" component={SocialChallenge} />
      <Stack.Screen name="SCBriefing" component={Briefing} />
      <Stack.Screen name="SCChat" component={Chat} />
    </Stack.Navigator>
  );
}
