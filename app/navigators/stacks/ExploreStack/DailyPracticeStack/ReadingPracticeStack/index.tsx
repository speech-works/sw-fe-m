import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";

import ReadingPractice from "../../../../../screens/Academy/DailyPractice/pages/ReadingPractice";
import PoemPractice from "../../../../../screens/Academy/DailyPractice/pages/ReadingPractice/PoemPractice";
import QuotePractice from "../../../../../screens/Academy/DailyPractice/pages/ReadingPractice/QuotePractice";
import StoryPractice from "../../../../../screens/Academy/DailyPractice/pages/ReadingPractice/StoryPractice";
import WordPractice from "../../../../../screens/Academy/DailyPractice/pages/ReadingPractice/WordPractice";
import PhrasePractice from "../../../../../screens/Academy/DailyPractice/pages/ReadingPractice/PhrasePractice";
import { RDPStackParamList } from "./types";

const Stack = createNativeStackNavigator<RDPStackParamList>();

export default function RDPStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ReadingPractice" component={ReadingPractice} />
      <Stack.Screen
        name="StoryPractice"
        component={StoryPractice}
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen
        name="QuotePractice"
        component={QuotePractice}
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen
        name="PoemPractice"
        component={PoemPractice}
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen
        name="WordPractice"
        component={WordPractice}
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen
        name="PhrasePractice"
        component={PhrasePractice}
        options={{ gestureEnabled: false }}
      />
    </Stack.Navigator>
  );
}
