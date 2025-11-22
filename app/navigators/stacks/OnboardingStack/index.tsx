import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { OnboardingStackParamList } from "./types";
import { useOnboardingStore } from "../../../stores/onboarding"; // Import store

// Screens
import OnboardingWelcome from "../../../screens/Onboarding/OnboardingWelcome";
import OnboardingQuestion from "../../../screens/Onboarding/OnboardingQuestionScreen";
import OnboardingDone from "../../../screens/Onboarding/OnboardingDone";
import Academy from "../../../screens/Academy";

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export default function OnboardingStackNavigator() {
  // Read state directly.
  // Since this component mounts when 'forceOnboarding' becomes true in MainNavigator,
  // this state is fresh.
  const currentScreen = useOnboardingStore((s) => s.currentScreen);
  const flow = useOnboardingStore((s) => s.flow);

  // LOGIC FIX: Determine start screen
  // If we have a flow and are past screen 1, start at Question.
  // Otherwise, start at Welcome.
  const hasProgress = flow && currentScreen > 1;
  const initialRouteName = hasProgress
    ? "OnboardingQuestion"
    : "OnboardingWelcome";

  return (
    <Stack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="OnboardingWelcome" component={OnboardingWelcome} />

      <Stack.Screen
        name="OnboardingQuestion"
        component={OnboardingQuestion}
        // FIX: Pass initial params so the screen knows where to render immediately
        initialParams={{ screenNumber: currentScreen }}
      />

      <Stack.Screen name="OnboardingDone" component={OnboardingDone} />
      <Stack.Screen name="Academy" component={Academy} />
    </Stack.Navigator>
  );
}
