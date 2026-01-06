import React, { useEffect } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import BottomTabNavigator from "./BottomTabNavigator";
import SubscribeScreen from "../screens/Payments";
import PhoneCall from "../screens/Academy/DailyPractice/pages/Exposure/PhoneCall";
import { View } from "react-native";

import AcademyStackNavigator from "./stacks/AcademyStack";

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
      <Stack.Screen name="AcademyStack" component={AcademyStackNavigator} />
      <Stack.Screen
        name="PhoneCallScreen"
        component={PhoneCall}
        options={{
          animation: "slide_from_bottom",
        }}
      />
      <Stack.Screen
        name="PremiumModal"
        component={SubscribeScreen}
        options={{
          presentation: "modal",
          animation: "slide_from_bottom",
        }}
      />
    </Stack.Navigator>
  );
}
