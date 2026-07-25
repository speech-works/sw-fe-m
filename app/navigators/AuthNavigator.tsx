import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React, { useEffect, useState } from "react";
import Auth from "../screens/Auth";
import ActOneWelcome from "../screens/PreAuth/ActOneWelcome";
import ActOneTeaser from "../screens/PreAuth/ActOneTeaser";
import OnboardingQuestionScreen from "../screens/Onboarding/OnboardingQuestionScreen";
import { useOnboardingDraftStore } from "../stores/onboardingDraft";
import { PRE_AUTH_ONBOARDING_ENABLED } from "../constants/features";

export type AuthStackParamList = {
  ActOneWelcome: undefined;
  ActOneQuestion: { screenNumber: number; preAuth: true };
  ActOneTeaser: undefined;
  Auth: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

/**
 * The logged-out half of the app.
 *
 * It used to be one screen: log in. Act 1 — five questions asked before any
 * account exists — now sits in FRONT of it, in this same stack.
 *
 * Deliberately here rather than as a new branch in MainNavigator. That file
 * holds the single line deciding what EVERY user sees on open; a mistake there
 * reaches people who are already signed in. Putting Act 1 inside this navigator
 * means a logged-in user never renders any of it, so the blast radius is only
 * people who are logged out — who today see exactly one screen anyway.
 */
export default function AuthNavigator() {
  const draftCompleted = useOnboardingDraftStore((s) => s.completedAt);

  // WAIT FOR STORAGE BEFORE CHOOSING THE FIRST SCREEN.
  //
  // The draft persists to AsyncStorage, which rehydrates asynchronously and
  // separately from React's first render. Reading `completedAt` immediately
  // gets the un-rehydrated default (null) — so someone who had already finished
  // Act 1 would be shown question one for a frame before being corrected.
  // `initialRouteName` is only read at mount, so a wrong value at that instant
  // is not self-healing; it has to be right the first time.
  const [hydrated, setHydrated] = useState(() =>
    useOnboardingDraftStore.persist.hasHydrated(),
  );
  useEffect(() => {
    if (hydrated) return;
    const unsub = useOnboardingDraftStore.persist.onFinishHydration(() =>
      setHydrated(true),
    );
    // Guard against the hydration finishing between the initial read and this
    // subscription, which would otherwise leave us waiting forever.
    if (useOnboardingDraftStore.persist.hasHydrated()) setHydrated(true);
    return unsub;
  }, [hydrated]);

  if (!hydrated) return null;

  const startAtActOne = PRE_AUTH_ONBOARDING_ENABLED && !draftCompleted;

  return (
    <Stack.Navigator
      initialRouteName={startAtActOne ? "ActOneWelcome" : "Auth"}
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        // Off by default so the flow reads as forward motion; re-enabled on the
        // question screen below, where back-swipe is the only way to revise an
        // answer (same rule as the post-signup stack).
        gestureEnabled: false,
      }}
    >
      <Stack.Screen name="ActOneWelcome" component={ActOneWelcome} />
      <Stack.Screen
        name="ActOneQuestion"
        component={OnboardingQuestionScreen}
        options={{ gestureEnabled: true }}
        initialParams={{ screenNumber: 1, preAuth: true }}
      />
      <Stack.Screen name="ActOneTeaser" component={ActOneTeaser} />
      <Stack.Screen
        name="Auth"
        component={Auth}
        // Swipe-back so someone who taps "I already have an account" and then
        // realises they don't have one isn't stranded on the login screen with
        // no route back to the questions. A no-op when Auth is the first route
        // (flag off, or Act 1 already finished) — there is nothing behind it.
        options={{ gestureEnabled: true }}
      />
    </Stack.Navigator>
  );
}
