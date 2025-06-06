import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import ReadingPractice from "../../../../../screens/Academy/DailyPractice/pages/ReadingPractice";
import { RDPStackParamList } from "./types";
import StoryPractice from "../../../../../screens/Academy/DailyPractice/pages/ReadingPractice/StoryPractice";
import QuotePractice from "../../../../../screens/Academy/DailyPractice/pages/ReadingPractice/QuotePractice";
import PoemPractice from "../../../../../screens/Academy/DailyPractice/pages/ReadingPractice/PoemPractice";

const Stack = createNativeStackNavigator<RDPStackParamList>();

export default function RDPStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ReadingPractice" component={ReadingPractice} />
      <Stack.Screen name="StoryPractice" component={StoryPractice} />
      <Stack.Screen name="QuotePractice" component={QuotePractice} />
      <Stack.Screen name="PoemPractice" component={PoemPractice} />
    </Stack.Navigator>
  );
}
