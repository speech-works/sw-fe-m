import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { MoodFUStackParamList } from "./types";
import FollowUp from "../../../../../screens/Academy/components/MoodCheck/FollowUp";
import Breathing from "../../../../../screens/Academy/DailyPractice/pages/CognitivePractice/Breathing";
import Meditation from "../../../../../screens/Academy/DailyPractice/pages/CognitivePractice/Meditation";
import Reframe from "../../../../../screens/Academy/DailyPractice/pages/CognitivePractice/Reframe";
import RoleplayFDPStackNavigator from "../../DailyPracticeStack/FunPracticeStack/RoleplayPracticeStack";
import StoryPractice from "../../../../../screens/Academy/DailyPractice/pages/ReadingPractice/StoryPractice";
import { MOOD } from "../../../../../types/mood";

const Stack = createNativeStackNavigator<MoodFUStackParamList>();

interface MoodFUStackNavigatorProps {
  initialMood: MOOD;
}

export default function MoodFUStackNavigator({
  initialMood,
}: MoodFUStackNavigatorProps) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="FollowUp"
        component={FollowUp}
        initialParams={{ mood: initialMood }}
      />
      <Stack.Screen name="BreathingPractice" component={Breathing} />
      <Stack.Screen
        name="MeditationPractice"
        component={Meditation}
        initialParams={{ mood: initialMood }}
      />
      <Stack.Screen name="ReframePractice" component={Reframe} />
      <Stack.Screen
        name="RoleplayPracticeStack"
        component={RoleplayFDPStackNavigator}
      />
      <Stack.Screen name="StoryPractice" component={StoryPractice} />
    </Stack.Navigator>
  );
}
