import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { InterviewEDPStackParamList } from "./types";
import Interview from "../../../../../../screens/Academy/DailyPractice/pages/Exposure/Interview";
import Briefing from "../../../../../../screens/Academy/DailyPractice/pages/Exposure/Interview/Briefing";
import Chat from "../../../../../../screens/Academy/DailyPractice/pages/Exposure/Interview/Chat";

const Stack = createNativeStackNavigator<InterviewEDPStackParamList>();

export default function InterviewEDPStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="InterviewList" component={Interview} />
      <Stack.Screen name="InterviewBriefing" component={Briefing} />
      <Stack.Screen name="InterviewChat" component={Chat} />
    </Stack.Navigator>
  );
}
