import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React, { useEffect } from "react";
import SubscribeScreen from "../screens/Payments";
import BottomTabNavigator from "./BottomTabNavigator";

import ExploreStackNavigator from "./stacks/ExploreStack";
import PostComposer from "../screens/PostComposer";
import Resources from "../screens/Resources";

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
        name="PostComposer"
        component={PostComposer}
        options={{ presentation: "modal" }}
      />
      <Stack.Screen name="Resources" component={Resources} />
    </Stack.Navigator>
  );
}
