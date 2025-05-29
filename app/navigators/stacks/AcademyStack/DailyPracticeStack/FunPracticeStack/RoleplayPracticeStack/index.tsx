import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { RoleplayFDPStackParamList } from "./types";
import Roleplay from "../../../../../../screens/Academy/DailyPractice/pages/FunPractice/Roleplay";
import Briefing from "../../../../../../screens/Academy/DailyPractice/pages/FunPractice/Roleplay/Briefing";
import Chat from "../../../../../../screens/Academy/DailyPractice/pages/FunPractice/Roleplay/Chat";

const Stack = createNativeStackNavigator<RoleplayFDPStackParamList>();

export default function RoleplayFDPStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="RoleplayList" component={Roleplay} />
      <Stack.Screen name="RoleplayBriefing" component={Briefing} />
      <Stack.Screen name="RoleplayChat" component={Chat} />
    </Stack.Navigator>
  );
}
