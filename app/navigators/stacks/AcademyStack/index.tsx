import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import Academy from "../../../screens/Academy";
import { AcademyStackParamList } from "./types";
import DPStackNavigator from "./DailyPracticeStack";
import LibStackNavigator from "./LibraryStack";
import ChalStackNavigator from "./ChallengesStack";
import MoodCheckStackNavigator from "./MoodCheckStack";
import PDStackNavigator from "./ProgressDetailStack";

const Stack = createNativeStackNavigator<AcademyStackParamList>();

export default function AcademyStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Academy" component={Academy} />
      <Stack.Screen name="DailyPracticeStack" component={DPStackNavigator} />
      <Stack.Screen name="LibraryStack" component={LibStackNavigator} />
      <Stack.Screen name="ChallengesStack" component={ChalStackNavigator} />
      <Stack.Screen name="ProgressDetailStack" component={PDStackNavigator} />
      <Stack.Screen name="MoodCheckStack" component={MoodCheckStackNavigator} />
    </Stack.Navigator>
  );
}
