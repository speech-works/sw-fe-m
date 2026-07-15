import React, { useEffect, useState } from "react";
import { navigationRef } from "../util/functions/navigation";
import { useStaminaNotificationStore } from "../stores/staminaNotification";
import { useUserStore } from "../stores/user";
import LowStaminaModal from "./LowStaminaModal";

/**
 * Safe screens: tab-root routes that indicate the user has exited an activity.
 * Activity screens live under ExploreStack / PhoneCall / PackModule, etc.
 * When the user lands on any of these, we know it's safe to surface a modal.
 */
const SAFE_SCREENS = new Set([
  "Home",
  "Explore",
  "Settings",
  "Community",
]);

/**
 * GlobalStaminaController
 *
 * A renderless controller (returns only the modal) mounted at app root.
 * Watches navigation state changes. When the user returns to a tab-root
 * "safe" screen and there is a queued resource warning modal:
 *
 * 1. Re-checks live resource state and silently cancels stale warnings.
 * 2. Shows the appropriate modal when the warning is still relevant.
 *
 * After the modal is dismissed, resetAll() re-arms the system for the
 * next qualifying resource threshold event.
 *
 * Bug Fix #1: The navigation listener is registered ONCE (empty dep array).
 * All Zustand state is read via getState() inside the callback so there
 * are never stale closures. Previously, having `staminaModalQueued` in
 * the dep array caused the listener to be torn-down and re-mounted every
 * time the flag flipped, and Android's extra navigation state events
 * during that re-mount window caused the modal to fire multiple times.
 */
const GlobalStaminaController: React.FC = () => {
  const [activeModal, setActiveModal] = useState<"stamina" | null>(null);

  useEffect(() => {
    if (!navigationRef.isReady()) return;

    const unsubscribe = navigationRef.addListener("state", () => {
      // Read live Zustand state every time — no stale closure risk.
      const {
        staminaModalQueued,
        setStaminaModalQueued,
        resetAll: resetStaminaNotification,
      } = useStaminaNotificationStore.getState();

      if (!staminaModalQueued) return;

      const currentRoute = navigationRef.getCurrentRoute();
      if (!currentRoute) return;

      const routeName = currentRoute.name;
      if (!SAFE_SCREENS.has(routeName)) return;

      const user = useUserStore.getState().user;

      // Stamina is the single gating concept for everyone now (§6.10) — this
      // modal applies to free and paid users alike (free = the small bar).
      if (
        user &&
        user.currentStamina !== undefined &&
        user.maxStaminaCap
      ) {
        const pct = (user.currentStamina / user.maxStaminaCap) * 100;

        if (pct >= 10) {
          // Stamina has recovered since the queue was set — cancel silently
          console.log(
            "[StaminaAlert] Stamina recovered (" +
              pct.toFixed(1) +
              "%) — cancelling queued modal",
          );
          resetStaminaNotification();
          return;
        }
      } else {
        resetStaminaNotification();
        return;
      }

      // Stamina still low — show the modal
      console.log(
        "[StaminaAlert] Showing LowStaminaModal on safe screen:",
        routeName,
      );
      setStaminaModalQueued(false);
      setActiveModal("stamina");
    });

    return () => {
      unsubscribe();
    };
  }, []); // Stable: registered once on mount; reads live store state inside.

  const handleClose = () => {
    setActiveModal(null);
    // Note: Do NOT call resetAll() here. We must keep the notification flags
    // armed until the underlying resource recovers, otherwise fetchUser()
    // could immediately re-trigger the same warning loop.
  };

  return (
    <LowStaminaModal
      visible={activeModal === "stamina"}
      onClose={handleClose}
    />
  );
};

export default GlobalStaminaController;
