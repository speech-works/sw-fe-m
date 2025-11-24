import React, { useContext, useEffect, useState } from "react";
import { AuthContext } from "../contexts/AuthContext";
import AuthNavigator from "./AuthNavigator";
import AppNavigator from "./AppNavigator";
import OnboardingStackNavigator from "./stacks/OnboardingStack";

import { useEventStore } from "../stores/events";
import { EVENT_NAMES } from "../stores/events/constants";
import { useUserStore } from "../stores/user";

export default function MainNavigator() {
  console.log("main navigator loaded..");

  const { isLoggedIn, logout } = useContext(AuthContext);
  const { user } = useUserStore();

  const { events, clear } = useEventStore();

  // prevents auto-onboarding AFTER a skip (only for this session)
  const [suppressAutoOnboarding, setSuppressAutoOnboarding] = useState(false);

  // when user actively asks to open onboarding (card press) we force it
  const [forceOnboarding, setForceOnboarding] = useState(true);

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

  // -----------------------------
  // Routing decision
  // -----------------------------
  if (!isLoggedIn) return <AuthNavigator />;

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
