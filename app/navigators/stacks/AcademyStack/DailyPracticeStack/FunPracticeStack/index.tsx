import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { FDPStackParamList } from "./types";
import FunPractice from "../../../../../screens/Academy/DailyPractice/pages/FunPractice";
import TwisterFDPStackNavigator from "./TwisterPracticeStack";

import CharacterVoiceFDPStackNavigator from "./CharacterVoicePracticeStack";
import RoleplayFDPStackNavigator from "./RoleplayPracticeStack";

const Stack = createNativeStackNavigator<FDPStackParamList>();

export default function FDPStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="FunPractice" component={FunPractice} />
      <Stack.Screen
        name="TwisterPracticeStack"
        component={TwisterFDPStackNavigator}
      />
      <Stack.Screen
        name="RoleplayPracticeStack"
        component={RoleplayFDPStackNavigator}
      />
      <Stack.Screen
        name="CharacterVoicePracticeStack"
        component={CharacterVoiceFDPStackNavigator}
      />
    </Stack.Navigator>
  );
}
