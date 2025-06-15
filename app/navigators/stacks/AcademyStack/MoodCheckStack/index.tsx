import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { MoodCheckStackParamList } from "./types";

import FollowUp from "../../../../screens/Academy/components/MoodCheck/FollowUp";

const Stack = createNativeStackNavigator<MoodCheckStackParamList>();

export default function MoodCheckStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="FollowUp" component={FollowUp} />
    </Stack.Navigator>
  );
}
