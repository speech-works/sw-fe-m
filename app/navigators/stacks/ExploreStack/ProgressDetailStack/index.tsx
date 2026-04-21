import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";

import ProgressDetail from "../../../../screens/Academy/ProgressDetail";
import { PDStackParamList } from "./types";

const Stack = createNativeStackNavigator<PDStackParamList>();

export default function PDStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProgressDetail" component={ProgressDetail} />
    </Stack.Navigator>
  );
}
