import React, { useEffect, useState } from "react";
import { PAYMENTS_ENABLED } from "../constants/features";
import { useEventStore } from "../stores/events";
import { EVENT_NAMES } from "../stores/events/constants";
import { useUserStore } from "../stores/user";
import { User } from "../api/users";
import { track } from "../util/analytics/postHog";
import { ANALYTICS_EVENTS } from "../util/analytics/analyticsEvents";
import {
  estimateStaminaRecharge,
  formatRechargeDuration,
} from "../util/functions/stamina";
import OutOfStaminaModal from "./OutOfStaminaModal";

/**
 * Builds the informational copy for a blocked start. Paid users have a stamina
 * tank that regenerates over time (so we can estimate a recharge ETA); free
 * users have run out of the day's free sessions (which reset the next day).
 */
function buildMessage(user: User | null): string {
  if (user?.isPaid) {
    const { isFull, msUntilFull } = estimateStaminaRecharge(user, Date.now());
    if (!isFull && msUntilFull > 0) {
      return `You've used up your energy for now. It refills over time — you'll be topped up in about ${formatRechargeDuration(
        msUntilFull,
      )}. Rest your voice and come back stronger.`;
    }
    return "You've used up your energy for now. It refills over time — rest your voice and check back in a little while.";
  }
  return "You've used all your free practice sessions for today. Fresh sessions unlock tomorrow — rest your voice and come back then.";
}

/**
 * OutOfStaminaController
 *
 * A renderless controller (mounted at app root) that gives the user visible
 * feedback when a practice start is refused for INSUFFICIENT_STAMINA. The API
 * layer dispatches `SHOW_STAMINA_UPSELL` on that rejection; while monetization
 * is dormant, {@link ./UpsellModal} renders nothing, so without this the event
 * would fire into the void and the blocked tap would look like a no-op.
 *
 * This owns the event ONLY while payments are off — it early-returns null when
 * `PAYMENTS_ENABLED`, so exactly one of {UpsellModal, this} ever consumes the
 * event (they gate on the same compile-time constant, oppositely). Unlike the
 * proactive GlobalStaminaController (which defers to a "safe" tab-root screen),
 * this fires immediately, because the block just happened under the user's tap.
 */
const OutOfStaminaController: React.FC = () => {
  // The guard now sits below the hooks (mirrors UpsellModal, which got the same
  // treatment). Note the condition is INVERTED relative to UpsellModal: exactly
  // one of the two consumes the event, and this one owns it while billing is
  // off. `PAYMENTS_ENABLED` is read at runtime from `Constants.expoConfig.extra`
  // — fixed for the process lifetime, so the old top-of-component guard was
  // safe in practice, but not "compile-time" as the previous note claimed.
  const { events, clear } = useEventStore();
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    // Stays inert when billing ships — UpsellModal takes the event over, and
    // both must never consume it at once.
    if (PAYMENTS_ENABLED) return;
    if (!events || events.length === 0) return;

    const hit = events.find(
      (event) => event.name === EVENT_NAMES.SHOW_STAMINA_UPSELL,
    );
    if (!hit) return;

    const user = useUserStore.getState().user;
    setMessage(buildMessage(user));
    setVisible(true);
    track(ANALYTICS_EVENTS.STAMINA_DEPLETED, {
      isPaid: user?.isPaid ?? null,
    });
    clear(EVENT_NAMES.SHOW_STAMINA_UPSELL);
  }, [events, clear]);

  // EVERY hook must stay above this line.
  if (PAYMENTS_ENABLED) return null;

  return (
    <OutOfStaminaModal
      visible={visible}
      onClose={() => setVisible(false)}
      message={message}
    />
  );
};

export default OutOfStaminaController;
