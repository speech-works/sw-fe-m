import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import ReadingPractice from "../../../../../screens/Academy/DailyPractice/pages/ReadingPractice";
import { RDPStackParamList } from "./types";

const Stack = createNativeStackNavigator<RDPStackParamList>();

export default function RDPStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ReadingPractice" component={ReadingPractice} />
    </Stack.Navigator>
  );
}
