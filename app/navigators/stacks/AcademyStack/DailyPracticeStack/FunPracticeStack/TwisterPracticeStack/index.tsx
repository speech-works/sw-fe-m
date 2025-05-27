import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { TwisterFDPStackParamList } from "./types";

import Twister from "../../../../../../screens/Academy/DailyPractice/pages/FunPractice/Twister";

const Stack = createNativeStackNavigator<TwisterFDPStackParamList>();

export default function TwisterFDPStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="TwisterExercise" component={Twister} />
    </Stack.Navigator>
  );
}
