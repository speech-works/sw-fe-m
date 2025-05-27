import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { CharacterVoiceFDPStackParamList } from "./types";

import CharacterVoice from "../../../../../../screens/Academy/DailyPractice/pages/FunPractice/CharacterVoice";

const Stack = createNativeStackNavigator<CharacterVoiceFDPStackParamList>();

export default function CharacterVoiceFDPStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CVHome" component={CharacterVoice} />
    </Stack.Navigator>
  );
}
