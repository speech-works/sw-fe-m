import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { InterviewEDPStackParamList } from "./types";
import Interview from "../../../../../../screens/Academy/DailyPractice/pages/Exposure/Interview";

const Stack = createNativeStackNavigator<InterviewEDPStackParamList>();

export default function InterviewEDPStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="InterviewList" component={Interview} />
    </Stack.Navigator>
  );
}
