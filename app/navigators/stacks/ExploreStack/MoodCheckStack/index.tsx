import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";

import { MoodType } from "../../../../api/moodCheck/types";
import MoodFUStackNavigator from "./FollowUpStack";
import { MoodCheckStackParamList } from "./types";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import MoodCheck from "../../../../screens/Academy/components/MoodCheck";

const Stack = createNativeStackNavigator<MoodCheckStackParamList>();

export default function MoodCheckStackNavigator() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="CheckIn" component={MoodCheck} />
        <Stack.Screen
          name="FollowUpStack"
          /* `children` as a render prop is React Navigation's own documented
           * API for an inline screen that needs route params — not the React
           * anti-pattern this rule targets. Worth revisiting as a named
           * component one day: an inline arrow changes identity every render,
           * which can remount the screen and lose its state. */
          // eslint-disable-next-line react/no-children-prop
          children={({ route }) => {
            // Extract mood from the route params of MoodCheckStackParamList's FollowUpStack
            const { mood } = route.params as { mood: MoodType };
            // Pass the mood prop to MoodFUStackNavigator
            return <MoodFUStackNavigator initialMood={mood} />;
          }}
        />
      </Stack.Navigator>
    </GestureHandlerRootView>
  );
}
