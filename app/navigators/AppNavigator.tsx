import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React, { useEffect } from "react";
import SubscribeScreen from "../screens/Payments";
import BottomTabNavigator from "./BottomTabNavigator";

import ExploreStackNavigator from "./stacks/ExploreStack";
import PracticeComposer from "../screens/PracticeComposer";
import Resources from "../screens/Resources";
import ShareMomentScreen from "../screens/ShareMoment";
import AvatarStudio from "../screens/AvatarStudio";

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
      {/* The avatar editor — root-registered so Home's identity card (and later
          Settings) reach it by name from any stack. */}
      <Stack.Screen name="AvatarStudio" component={AvatarStudio} />
    </Stack.Navigator>
  );
}
