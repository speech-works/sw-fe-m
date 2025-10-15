import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { SBEDPStackParamList } from "./types";
import SecondaryBehaviors from "../../../../../../screens/Academy/DailyPractice/pages/Exposure/SecondaryBehaviors";

const Stack = createNativeStackNavigator<SBEDPStackParamList>();

export default function SBEDPStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SBScreen" component={SecondaryBehaviors} />
    </Stack.Navigator>
  );
}
