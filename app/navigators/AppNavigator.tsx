import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React, { useEffect } from "react";
import SubscribeScreen from "../screens/Payments";
import BottomTabNavigator from "./BottomTabNavigator";

import ExploreStackNavigator from "./stacks/ExploreStack";
import PracticeComposer from "../screens/PracticeComposer";
import Resources from "../screens/Resources";
import ShareMomentScreen from "../screens/ShareMoment";
import AvatarStudio from "../screens/AvatarStudio";
import FirstCall from "../screens/FirstCall";

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  useEffect(() => {
    console.log("AppNavigator mounted");
    return () => {
      console.log("AppNavigator unmounted");
    };
  }, []);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Root" component={BottomTabNavigator} />
      <Stack.Screen name="ExploreStack" component={ExploreStackNavigator} />
      <Stack.Screen
        name="PremiumModal"
        component={SubscribeScreen}
        options={{
          presentation: "transparentModal",
          animation: "none",
        }}
      />
      <Stack.Screen
        name="PracticeComposer"
        component={PracticeComposer}
        options={{
          presentation: "transparentModal",
          animation: "none",
        }}
      />
      <Stack.Screen name="Resources" component={Resources} />
      <Stack.Screen
        name="ShareMoment"
        component={ShareMomentScreen}
      />
      {/* Buddy discovery. Root-registered rather than pushed from a Community
          stack, because Community is a bare tab screen with no stack of its
          own — same reason ShareMoment lives here. */}
      {/* The avatar editor — root-registered so Home's identity card (and later
          Settings) reach it by name from any stack. */}
      <Stack.Screen name="AvatarStudio" component={AvatarStudio} />
      {/* The once-in-a-lifetime first call. Root-registered and gesture-locked:
          it owns the whole screen for its five minutes (an incoming call is not
          a page you swipe away from mid-ring), and the user reaches it from
          Home today but will be sent here from the end of onboarding too. */}
      <Stack.Screen
        name="FirstCall"
        component={FirstCall}
        options={{ gestureEnabled: false }}
      />
    </Stack.Navigator>
  );
}
