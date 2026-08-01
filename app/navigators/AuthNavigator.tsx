import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React, { useEffect, useState } from "react";
import Auth from "../screens/Auth";
import ActOneWelcome from "../screens/PreAuth/ActOneWelcome";
import ActOneTeaser from "../screens/PreAuth/ActOneTeaser";
import ActOneCallOffer from "../screens/PreAuth/ActOneCallOffer";
import OnboardingQuestionScreen from "../screens/Onboarding/OnboardingQuestionScreen";
import { useOnboardingDraftStore } from "../stores/onboardingDraft";
import { PRE_AUTH_ONBOARDING_ENABLED } from "../constants/features";
import { pickAuthEntryRoute } from "./authEntryRoute";

export type AuthStackParamList = {
  ActOneWelcome: undefined;
  ActOneQuestion: { screenNumber: number; preAuth: true };
  ActOneTeaser: undefined;
  ActOneCallOffer: undefined;
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

  // WHERE A RETURNING STRANGER LANDS — three states, not two.
  //
  //   · flag off                    → the old login-first app
  //   · nothing answered yet        → the welcome screen
  //   · Act 1 finished, no account  → their own result
  //
  // That last case used to open on `Auth`. The justification on record was a
  // returning user who reinstalls — but reinstalling wipes AsyncStorage, so
  // `completedAt` is null for precisely that person and the branch never fired
  // for them. Who it actually caught was someone who answered all five
  // questions, reached the payoff, and closed the app: handed a login wall on
  // their next open, with no route back to the result their answers earned.
  // That wall is the thing Act 1 exists to remove, so this is the one place it
  // must not be the default.
  //
  // The teaser is safe as a stack root: it takes no route params and reads the
  // draft store directly (cleared only after a successful post-signup replay),
  // then hands off to the call offer and signup exactly as on the forward path.
  // It carries its own way out to login when it is the root — see the note on
  // the sign-in row there.
  //
  // The choice itself lives in `authEntryRoute` so it can be asserted without
  // mounting this navigator.
  const initialRouteName = pickAuthEntryRoute({
    preAuthEnabled: PRE_AUTH_ONBOARDING_ENABLED,
    draftCompleted,
  });

  return (
    <Stack.Navigator
      initialRouteName={initialRouteName}
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
      {/* The offer sits between the payoff and the account: the teaser is what
          we heard, this is what we're giving them for it. */}
      <Stack.Screen name="ActOneCallOffer" component={ActOneCallOffer} />
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
