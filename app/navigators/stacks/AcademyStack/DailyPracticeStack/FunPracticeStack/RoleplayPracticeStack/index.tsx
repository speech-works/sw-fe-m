import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { RoleplayFDPStackParamList } from "./types";
import Roleplay from "../../../../../../screens/Academy/DailyPractice/pages/FunPractice/Roleplay";

const Stack = createNativeStackNavigator<RoleplayFDPStackParamList>();

export default function RoleplayFDPStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="RoleplayList" component={Roleplay} />
    </Stack.Navigator>
  );
}
