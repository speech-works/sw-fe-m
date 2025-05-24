import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import Academy from "../../../screens/Academy";
import { AcademyStackParamList } from "./types";
import DPStackNavigator from "./DailyPracticeStack";
import LibStackNavigator from "./LibraryStack";
import ChalStackNavigator from "./ChallengesStack";

const Stack = createNativeStackNavigator<AcademyStackParamList>();

export default function AcademyStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Academy" component={Academy} />
      <Stack.Screen name="DailyPracticeStack" component={DPStackNavigator} />
      <Stack.Screen name="LibraryStack" component={LibStackNavigator} />
      <Stack.Screen name="ChallengesStack" component={ChalStackNavigator} />
    </Stack.Navigator>
  );
}
