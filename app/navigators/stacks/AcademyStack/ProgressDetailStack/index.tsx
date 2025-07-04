import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { PDStackParamList } from "./types";
import ProgressDetail from "../../../../screens/Academy/ProgressDetail";

const Stack = createNativeStackNavigator<PDStackParamList>();

export default function PDStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProgressDetail" component={ProgressDetail} />
    </Stack.Navigator>
  );
}
