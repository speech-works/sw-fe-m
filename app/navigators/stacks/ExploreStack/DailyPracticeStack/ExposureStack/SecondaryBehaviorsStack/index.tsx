import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";

import SecondaryBehaviors from "../../../../../../screens/Academy/DailyPractice/pages/Exposure/SecondaryBehaviors";
import { SBEDPStackParamList } from "./types";

const Stack = createNativeStackNavigator<SBEDPStackParamList>();

export default function SBEDPStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SBScreen" component={SecondaryBehaviors} />
    </Stack.Navigator>
  );
}
