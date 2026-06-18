import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";
import { useOnboardingStore } from "../../../stores/onboarding"; // Import store
import { OnboardingStackParamList } from "./types";

// Screens
import OnboardingDone from "../../../screens/Onboarding/OnboardingDone";
import OnboardingQuestion from "../../../screens/Onboarding/OnboardingQuestionScreen";
import OnboardingWelcome from "../../../screens/Onboarding/OnboardingWelcome";
import OnboardingPhonemes from "../../../screens/Onboarding/OnboardingPhonemes";

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export default function OnboardingStackNavigator() {
  // Read state directly.
  // Since this component mounts when 'forceOnboarding' becomes true in MainNavigator,
  // this state is fresh.
  const currentScreen = useOnboardingStore((s) => s.currentScreen);

  // LOGIC FIX: Dynamic initial route
  // If we have progress (screen > 1), start directly at the question.
  // Otherwise start at Welcome.
  const initialRouteName =
    currentScreen > 1 ? "OnboardingQuestion" : "OnboardingWelcome";

  return (
    <Stack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen
        name="OnboardingWelcome"
        component={OnboardingWelcome}
        options={{ gestureEnabled: false }}
      />

      {/* OnboardingQuestion intentionally keeps swipe enabled: it is the only
          way to step back and revise a previous answer (steps are pushed). */}
      <Stack.Screen
        name="OnboardingQuestion"
        component={OnboardingQuestion}
        // FIX: Pass initial params so the screen knows where to render immediately
        initialParams={{ screenNumber: currentScreen }}
      />

      <Stack.Screen
        name="OnboardingPhonemes"
        component={OnboardingPhonemes}
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen
        name="OnboardingDone"
        component={OnboardingDone}
        options={{ gestureEnabled: false }}
      />
    </Stack.Navigator>
  );
}
