import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SettingsStackParamList } from "./types";
import Settings from "../../../screens/Settings";
import ProgressDetail from "../../../screens/Academy/ProgressDetail";

const Stack = createNativeStackNavigator<SettingsStackParamList>();

export default function SettingsStackNavigator() {
  console.log("in SettingsStackNavigator");
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Settings" component={Settings} />
      <Stack.Screen name="ProgressDetail" component={ProgressDetail} />
    </Stack.Navigator>
  );
}
