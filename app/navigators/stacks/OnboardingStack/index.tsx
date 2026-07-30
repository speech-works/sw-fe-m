import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";
import { OnboardingStackParamList } from "./types";

// Screens
import OnboardingDone from "../../../screens/Onboarding/OnboardingDone";
import OnboardingQuestion from "../../../screens/Onboarding/OnboardingQuestionScreen";
import OnboardingWelcome from "../../../screens/Onboarding/OnboardingWelcome";
import OnboardingPhonemes from "../../../screens/Onboarding/OnboardingPhonemes";

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

/**
 * ALWAYS ENTERS AT THE WELCOME SCREEN. This is load-bearing, not cosmetic.
 *
 * It used to pick its initial route from the persisted `currentScreen`
 * (`currentScreen > 1 ? "OnboardingQuestion" : "OnboardingWelcome"`) and hand
 * that number straight through as `initialParams`. Two things made that
 * dangerous:
 *
 *   1. `currentScreen` is a POSITION COUNTER, not a record of progress. It
 *      drifts ahead of the answers — going back to revise never decremented it
 *      — so people were dropped into the middle of a questionnaire with earlier
 *      required questions unanswered AND unreachable (no back arrow, because
 *      those screens were never pushed).
 *   2. Jumping to the question screen skips `OnboardingWelcome`, which is the
 *      ONLY caller of `enterFlow()` — and `enterFlow` is the only place
 *      `answersAreReadable()` runs and the only place the resume point is
 *      recomputed against the freshly fetched flow. The guard written to
 *      protect users whose answers were reset server-side was skipped in
 *      exactly the situation it existed for.
 *
 * Welcome now resolves the resume point from the SERVER's answers and navigates
 * there itself. The cost is one tap on resume; the benefit is that every entry
 * point lands on the first genuinely unanswered question.
 */
export default function OnboardingStackNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="OnboardingWelcome"
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
          way to step back and revise a previous answer (steps are pushed).

          NO `initialParams`: the screen number now always arrives from the
          navigate() call in OnboardingWelcome, which derived it from the
          server's answers. Seeding it from the store here is what let a stale
          counter decide where somebody landed. */}
      <Stack.Screen name="OnboardingQuestion" component={OnboardingQuestion} />

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
