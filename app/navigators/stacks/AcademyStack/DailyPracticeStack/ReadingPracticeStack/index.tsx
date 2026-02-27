import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";

import ReadingPractice from "../../../../../screens/Academy/DailyPractice/pages/ReadingPractice";
import PoemPractice from "../../../../../screens/Academy/DailyPractice/pages/ReadingPractice/PoemPractice";
import QuotePractice from "../../../../../screens/Academy/DailyPractice/pages/ReadingPractice/QuotePractice";
import StoryPractice from "../../../../../screens/Academy/DailyPractice/pages/ReadingPractice/StoryPractice";
import { RDPStackParamList } from "./types";

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
