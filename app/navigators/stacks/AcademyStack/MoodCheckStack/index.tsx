import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { MoodCheckStackParamList } from "./types";
import MoodFUStackNavigator from "./FollowUpStack";
import { MoodType } from "../../../../api/moodCheck/types";

const Stack = createNativeStackNavigator<MoodCheckStackParamList>();

export default function MoodCheckStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="FollowUpStack"
        children={({ route }) => {
          // Extract mood from the route params of MoodCheckStackParamList's FollowUpStack
          const { mood } = route.params as { mood: MoodType };
          // Pass the mood prop to MoodFUStackNavigator
          return <MoodFUStackNavigator initialMood={mood} />;
        }}
      />
    </Stack.Navigator>
  );
}
