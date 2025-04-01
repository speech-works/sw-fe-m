import React, { useContext, useEffect, useState } from "react";
import { AuthContext } from "../contexts/AuthContext";
import AuthNavigator from "./AuthNavigator";
import AppNavigator from "./AppNavigator";
import { useEventStore } from "../stores/events"; // Import the Zustand store
import { EVENT_NAMES } from "../stores/events/constants"; // Import the event names

export default function MainNavigator() {
  console.log("main navigator loaded..");
  const { events, clear: clearEvent } = useEventStore();
  const { isLoggedIn, logout } = useContext(AuthContext);

  useEffect(() => {
    events.forEach((event) => {
      if (event.name === EVENT_NAMES.USER_LOGGED_OUT) {
        clearEvent(EVENT_NAMES.USER_LOGGED_OUT);
        logout();
      }
    });
  }, [events, clearEvent]);

  return isLoggedIn ? <AppNavigator /> : <AuthNavigator />;
}
