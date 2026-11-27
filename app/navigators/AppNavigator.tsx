import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React, { useEffect } from "react";
import { DevSettings } from "react-native";
import SubscribeScreen from "../screens/Payments";
import BottomTabNavigator from "./BottomTabNavigator";

import ExploreStackNavigator from "./stacks/ExploreStack";
import PracticeComposer from "../screens/PracticeComposer";
import Resources from "../screens/Resources";
import ShareMomentScreen from "../screens/ShareMoment";
import AvatarStudio from "../screens/AvatarStudio";
import FirstCall from "../screens/FirstCall";
import { navigationRef } from "../util/functions/navigation";
// The Pip lab: dev builds open it from the dev menu. A release build made with EXPO_PUBLIC_PIP_LAB=1 (speed checks on a real phone)
// opens it at start. Normal release builds do not register it.
import PipLab from "../screens/PipLab";
import FxLab from "../screens/FxLab";
// The Moments lab (founder picks 2 of 4 Pip moves for each of 24 moments): dev menu "Moments lab", lab builds only.
import MomentsLab from "../screens/MomentsLab";
// EXPO_PUBLIC_PIP_LAB=moments: the same lab build, opening on the Moments lab (the founder picks Pip's moments on the phone).
const LAB_START = process.env.EXPO_PUBLIC_PIP_LAB;
const PIP_LAB = __DEV__ || LAB_START === "1" || LAB_START === "moments";
const toPipLab = () => { if (navigationRef.isReady()) navigationRef.reset({ index: 0, routes: [{ name: "PipLab" }] }); };
const toFxLab = () => { if (navigationRef.isReady()) navigationRef.reset({ index: 0, routes: [{ name: "FxLab" }] }); };
const toMomentsLab = () => { if (navigationRef.isReady()) navigationRef.reset({ index: 0, routes: [{ name: "MomentsLab" }] }); };

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  useEffect(() => {
    // the lab replaces the whole stack, so nothing else on screen costs frames while it measures (Reload to leave it)
    if (__DEV__) { DevSettings.addMenuItem("Pip lab", toPipLab); DevSettings.addMenuItem("FX lab", toFxLab); DevSettings.addMenuItem("Moments lab", toMomentsLab); }
    if (!__DEV__ && PIP_LAB) { const h = setTimeout(LAB_START === "moments" ? toMomentsLab : toFxLab, 1500); return () => clearTimeout(h); }
  }, []);
  useEffect(() => {
    console.log("AppNavigator mounted");
    return () => {
      console.log("AppNavigator unmounted");
    };
  }, []);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Root" component={BottomTabNavigator} />
      {PIP_LAB ? <Stack.Screen name="PipLab" component={PipLab} /> : null}
      {PIP_LAB ? <Stack.Screen name="FxLab" component={FxLab} /> : null}
      {PIP_LAB ? <Stack.Screen name="MomentsLab" component={MomentsLab} /> : null}
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
