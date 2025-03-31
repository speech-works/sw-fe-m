// src/navigators/HomeStackNavigator.tsx
import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import Home from "../../screens/Home";
import PracticeBreathingScreen from "../../screens/Home/components/PracticeBreathing";
import PracticeAffirmationScreen from "../../screens/Home/components/PracticeAffirmations";
import SmoothSpeechScreen from "../../screens/Home/components/SmoothSpeech";
import useScrollWrapper from "../../hooks/useScrollWrapper";
import { HomeStackParamList } from "..";
//import ExposureScreen from "../screens/Home/ExposureScreen";

const Stack = createNativeStackNavigator<HomeStackParamList>();

export default function HomeStackNavigator() {
  const ScrollWrapper = useScrollWrapper();
  const ScrollableHome = () => {
    return (
      <ScrollWrapper>
        <Home />
      </ScrollWrapper>
    );
  };
  const ScrollablePracticeBreathing = () => {
    return (
      <ScrollWrapper>
        <PracticeBreathingScreen />
      </ScrollWrapper>
    );
  };
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={ScrollableHome} />
      <Stack.Screen
        name="PracticeBreathing"
        component={ScrollablePracticeBreathing}
      />
      <Stack.Screen
        name="PracticeAffirmation"
        component={PracticeAffirmationScreen}
      />
      <Stack.Screen
        name="PracticeSmoothSpeech"
        component={SmoothSpeechScreen}
      />
      {/* <Stack.Screen name="PracticeExposure" component={ExposureScreen} /> */}
    </Stack.Navigator>
  );
}
