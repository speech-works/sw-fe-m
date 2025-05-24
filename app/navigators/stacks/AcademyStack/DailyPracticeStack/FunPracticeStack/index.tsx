import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { FDPStackParamList } from "./types";
import FunPractice from "../../../../../screens/Academy/DailyPractice/pages/FunPractice";

const Stack = createNativeStackNavigator<FDPStackParamList>();

export default function RDPStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="FunPractice" component={FunPractice} />
    </Stack.Navigator>
  );
}
