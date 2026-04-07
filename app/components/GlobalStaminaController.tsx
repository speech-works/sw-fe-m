import React, { useEffect, useState } from "react";
import { navigationRef } from "../util/functions/navigation";
import { useStaminaNotificationStore } from "../stores/staminaNotification";
import { useUserStore } from "../stores/user";
import LowStaminaModal from "./LowStaminaModal";

/**
 * Safe screens: tab-root routes that indicate the user has exited an activity.
 * Activity screens live under AcademyStack / PhoneCall / PackModule, etc.
 * When the user lands on any of these, we know it's safe to surface a modal.
 */
const SAFE_SCREENS = new Set([
  "Home",
  "Explore",
  "Settings",
  "Community",
  "Academy", // the DailyPractice tab root
]);

/**
 * GlobalStaminaController
 *
 * A renderless controller (returns only the modal) mounted at app root.
 * Watches navigation state changes. When the user returns to a tab-root
 * "safe" screen and there is a queued low-stamina modal:
 *
 * 1. Re-checks live stamina — if recovered above 10%, silently cancels.
 * 2. If still below 10%, shows the LowStaminaModal.
 *
 * After the modal is dismissed, resetAll() re-arms the system for the
 * next stamina crossing event.
 *
 * Bug Fix #1: The navigation listener is registered ONCE (empty dep array).
 * All Zustand state is read via getState() inside the callback so there
 * are never stale closures. Previously, having `staminaModalQueued` in
 * the dep array caused the listener to be torn-down and re-mounted every
 * time the flag flipped, and Android's extra navigation state events
 * during that re-mount window caused the modal to fire multiple times.
 */
const GlobalStaminaController: React.FC = () => {
  const [showModal, setShowModal] = useState(false);

  // Only `resetAll` is needed outside the listener (for the close handler).
  // Everything else is read live from getState() inside the listener.
  const resetAll = useStaminaNotificationStore((s) => s.resetAll);

  useEffect(() => {
    if (!navigationRef.isReady()) return;

    const unsubscribe = navigationRef.addListener("state", () => {
      // Read live Zustand state every time — no stale closure risk.
      const {
        staminaModalQueued,
        setStaminaModalQueued,
        resetAll: resetNotification,
      } = useStaminaNotificationStore.getState();

      if (!staminaModalQueued) return;

      const currentRoute = navigationRef.getCurrentRoute();
      if (!currentRoute) return;

      const routeName = currentRoute.name;
      if (!SAFE_SCREENS.has(routeName)) return;

      // We're on a safe screen — check if stamina actually warrants the modal
      const user = useUserStore.getState().user;
      if (user && user.currentStamina !== undefined && user.maxStaminaCap) {
        const pct = (user.currentStamina / user.maxStaminaCap) * 100;

        if (pct >= 10) {
          // Stamina has recovered since the queue was set — cancel silently
          console.log(
            "[StaminaAlert] Stamina recovered (" +
              pct.toFixed(1) +
              "%) — cancelling queued modal",
          );
          resetNotification();
          return;
        }
      }

      // Stamina still low — show the modal
      console.log(
        "[StaminaAlert] Showing LowStaminaModal on safe screen:",
        routeName,
      );
      setStaminaModalQueued(false);
      setShowModal(true);
    });

    return () => {
      unsubscribe();
    };
  }, []); // Stable: registered once on mount; reads live store state inside.

  const handleClose = () => {
    setShowModal(false);
    // Reset fully — re-arms the system for the next crossing event
    resetAll();
  };

  return <LowStaminaModal visible={showModal} onClose={handleClose} />;
};

export default GlobalStaminaController;
