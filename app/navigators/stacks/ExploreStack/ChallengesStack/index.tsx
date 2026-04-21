import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";

import Challenges from "../../../../screens/Academy/Challenges";
import { ChalStackParamList } from "./types";

const Stack = createNativeStackNavigator<ChalStackParamList>();

export default function ChalStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Challenges" component={Challenges} />
    </Stack.Navigator>
  );
}
