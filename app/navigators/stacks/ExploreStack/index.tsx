import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import Explore from "../../../screens/Explore";
import { ExploreStackParamList } from "./types";
import DPStackNavigator from "../AcademyStack/DailyPracticeStack";
import LibStackNavigator from "../AcademyStack/LibraryStack";
import ChalStackNavigator from "../AcademyStack/ChallengesStack";
import PDStackNavigator from "../AcademyStack/ProgressDetailStack";
import PaymentStackNavigator from "../PaymentStack";
// We reuse the stacks from AcademyStack since they are just navigators

const Stack = createNativeStackNavigator<ExploreStackParamList>();

export default function ExploreStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Explore" component={Explore} />
      <Stack.Screen name="DailyPracticeStack" component={DPStackNavigator} />
      <Stack.Screen name="LibraryStack" component={LibStackNavigator} />
      <Stack.Screen name="ChallengesStack" component={ChalStackNavigator} />
      <Stack.Screen name="ProgressDetailStack" component={PDStackNavigator} />
      <Stack.Screen name="PaymentStack" component={PaymentStackNavigator} />
    </Stack.Navigator>
  );
}
