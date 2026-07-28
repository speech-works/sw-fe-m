import React, { useContext, useEffect, useState } from "react";
import { AuthContext } from "../contexts/AuthContext";
import AppNavigator from "./AppNavigator";
import AuthNavigator from "./AuthNavigator";
import OnboardingStackNavigator from "./stacks/OnboardingStack";
import FirstCallNavigator from "./FirstCallNavigator";

import { useEventStore } from "../stores/events";
import { EVENT_NAMES } from "../stores/events/constants";
import { useUserStore } from "../stores/user";
import { useFirstCallStore } from "../stores/firstCall";
import { replayOnboardingDraft } from "../util/functions/replayOnboardingDraft";

export default function MainNavigator() {
  console.log("main navigator loaded..");
  const { isLoggedIn, logout } = useContext(AuthContext);
  const { user } = useUserStore();
  const userId = user?.id;

  const { events, clear } = useEventStore();

  // Said yes to the call before signing up — see the branch below.
  const acceptedPreSignup = useFirstCallStore((s) => s.acceptedPreSignup);
  const clearPreSignup = useFirstCallStore((s) => s.clearPreSignup);

  // prevents auto-onboarding AFTER a skip (only for this session)
  const [suppressAutoOnboarding, setSuppressAutoOnboarding] = useState(false);

  // when user actively asks to open onboarding (card press) we force it
  const [forceOnboarding, setForceOnboarding] = useState(false);

  useEffect(() => {
    if (!events || events.length === 0) return;
    console.log("MainNavigator EVENTS:", events);

    for (const event of events) {
      console.log("MainNavigator handling event:", event.name);

      if (event.name === EVENT_NAMES.START_ONBOARDING) {
        console.log("→ START_ONBOARDING matched");
        setForceOnboarding(true);
        setSuppressAutoOnboarding(false); // user explicitly opening onboarding
        clear(EVENT_NAMES.START_ONBOARDING);
      }

      if (event.name === EVENT_NAMES.STOP_ONBOARDING) {
        console.log("→ STOP_ONBOARDING matched");
        setForceOnboarding(false);
        setSuppressAutoOnboarding(true); // suppress auto onboarding for this session
        clear(EVENT_NAMES.STOP_ONBOARDING);
      }

      if (event.name === EVENT_NAMES.USER_LOGGED_OUT) {
        console.log("→ USER_LOGGED_OUT matched");
        logout();
        clear(EVENT_NAMES.USER_LOGGED_OUT);
      }
    }
  }, [events, clear, logout]);

  // A `fetchAllTrends()` on login lived here, pulling the clinical domain
  // scores that drew the Growth Profile. Nothing renders those any more, so it
  // was a network round-trip on every login whose result nobody read — and the
  // store, its selectors and the overallState API layer went with it.
  //
  // The backend still computes and returns this data; the client simply
  // ignores the fields. Whatever replaces the progress view will bring its own
  // shapes rather than inheriting these.

  // HAND THE PRE-SIGNUP ANSWERS OVER, ONCE AN ACCOUNT EXISTS.
  //
  // Act 1's five answers were held on the device (health-adjacent, and there
  // was no account to attach them to). This is the handover, and it lives here
  // rather than on the Auth screen for a specific reason: `login()` inside
  // `processAuthRedirect` flips `isLoggedIn`, which unmounts that screen
  // mid-function. A request started there can die before it lands.
  //
  // No-op for everyone who never went through Act 1. On failure the draft keeps
  // its answers and retries on the next open, so nobody silently loses them.
  useEffect(() => {
    if (!isLoggedIn || !userId) return;
    void replayOnboardingDraft();
  }, [isLoggedIn, userId]);

  // ONCE ONBOARDING IS ON SCREEN, KEEP IT ON SCREEN UNTIL THE USER FINISHES.
  //
  // The auto-show branch below is a live condition, not a latch, so the whole
  // OnboardingStack unmounted the instant `hasCompletedOnboarding` flipped —
  // and the server flips it at the LAST QUESTION, while the app still has two
  // screens to go (phoneme picker, then the "You're all set" payoff). Any user
  // refresh in that window tore the navigator down mid-flow and dropped the
  // person on Home, with:
  //   "The action 'NAVIGATE' with payload {"name":"OnboardingPhonemes"}
  //    was not handled by any navigator."
  // They never saw which program they'd been matched to — the one moment the
  // whole questionnaire was building towards.
  //
  // Latching into `forceOnboarding` reuses the existing "user opened onboarding
  // deliberately" path, which is already only cleared by STOP_ONBOARDING —
  // i.e. by finishing or skipping. Same teardown trigger, just an explicit one.
  useEffect(() => {
    if (!suppressAutoOnboarding && user && user.hasCompletedOnboarding === false) {
      setForceOnboarding(true);
    }
  }, [suppressAutoOnboarding, user]);

  // -----------------------------
  // Routing decision
  // -----------------------------
  if (!isLoggedIn) return <AuthNavigator />;

  // THE CALL THEY ALREADY SAID YES TO, BEFORE ANYTHING ELSE.
  //
  // Somebody who tapped "I'll take the call" on the last pre-signup screen and
  // then had to answer twelve more questions has been told one thing and given
  // another. It also buys nothing: the caller is matched from the two Act 1
  // answers they have already given, so the remaining questions cannot improve
  // it.
  //
  // The blast radius of a branch in this file is normally everybody, which is
  // why it is guarded on a flag only those people can have set. The flag is
  // cleared by `onFinished` on EVERY exit — taken, declined, deferred, or
  // failed — so nobody can be parked here; the render then falls through to
  // the onboarding branch below on the next pass.
  if (user && acceptedPreSignup) {
    return <FirstCallNavigator onFinished={clearPreSignup} />;
  }

  // If the user explicitly opened onboarding (card)
  if (forceOnboarding) {
    return <OnboardingStackNavigator />;
  }

  // Auto show onboarding only for first-time users and only if not suppressed
  if (
    !suppressAutoOnboarding &&
    user &&
    user.hasCompletedOnboarding === false
  ) {
    return <OnboardingStackNavigator />;
  }

  // Default app flow
  return <AppNavigator />;
}
