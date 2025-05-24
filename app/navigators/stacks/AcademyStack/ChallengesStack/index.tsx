import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { ChalStackParamList } from "./types";
import Challenges from "../../../../screens/Academy/Challenges";

const Stack = createNativeStackNavigator<ChalStackParamList>();

export default function ChalStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Challenges" component={Challenges} />
    </Stack.Navigator>
  );
}
