// src/navigators/HomeStackNavigator.tsx
import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import Home from "../../screens/Home";
import PracticeBreathingScreen from "../../screens/Home/components/PracticeBreathing";
import PracticeAffirmationScreen from "../../screens/Home/components/PracticeAffirmations";
import SmoothSpeechScreen from "../../screens/Home/components/SmoothSpeech";
import useScrollWrapper from "../../hooks/useScrollWrapper";
import { HomeStackParamList } from "..";
import Exposure from "../../screens/Home/components/Exposure";

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
  const ScrollablePracticeAffirmation = () => {
    return (
      <ScrollWrapper>
        <PracticeAffirmationScreen />
      </ScrollWrapper>
    );
  };
  const ScrollableSmoothSpeechScreen = () => {
    return (
      <ScrollWrapper>
        <SmoothSpeechScreen />
      </ScrollWrapper>
    );
  };

  const ScrollableExposureScreen = () => {
    return (
      <ScrollWrapper>
        <Exposure />
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
        component={ScrollablePracticeAffirmation}
      />
      <Stack.Screen
        name="PracticeSmoothSpeech"
        component={ScrollableSmoothSpeechScreen}
      />
      <Stack.Screen
        name="PracticeExposure"
        component={ScrollableExposureScreen}
      />
    </Stack.Navigator>
  );
}
