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
 */
const GlobalStaminaController: React.FC = () => {
  const [showModal, setShowModal] = useState(false);

  const { staminaModalQueued, setStaminaModalQueued, resetAll } =
    useStaminaNotificationStore();

  useEffect(() => {
    if (!navigationRef.isReady()) return;

    const unsubscribe = navigationRef.addListener("state", () => {
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
          resetAll();
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
  }, [staminaModalQueued, setStaminaModalQueued, resetAll]);

  const handleClose = () => {
    setShowModal(false);
    // Reset fully — re-arms the system for the next crossing event
    resetAll();
  };

  return <LowStaminaModal visible={showModal} onClose={handleClose} />;
};

export default GlobalStaminaController;
