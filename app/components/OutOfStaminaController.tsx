import React, { useEffect, useState } from "react";
import { purchasesAvailable } from "../services/purchases";
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
 * Builds the informational copy for a blocked start. Stamina is the single
 * gating concept for EVERYONE now (SPEECHWORKS-STRATEGY.md §6.10) — the old
 * "5 free sessions/day" counter, and with it the nightly reset, is gone. Both
 * tiers refill continuously; free just refills slower into a smaller bar. So
 * both get the same shape of message, and both get an ETA — telling a free
 * user to "come back tomorrow" was both wrong and needlessly discouraging when
 * their next point is often minutes away.
 */
function buildMessage(user: User | null): string {
  const { isFull, msUntilFull } = estimateStaminaRecharge(user, Date.now());
  if (!isFull && msUntilFull > 0) {
    return `You've used up your energy for now. It refills over time. You'll be topped up in about ${formatRechargeDuration(
      msUntilFull,
    )}.`;
  }
  return "You've used up your energy for now. It refills over time. Check back in a little while.";
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
  // one of the two consumes the event, and this one owns it while we cannot
  // sell. The predicate is `purchasesAvailable()` — the flag AND a RevenueCat
  // key for this platform — so on a build with no iOS key this controller
  // correctly keeps ownership instead of both components going silent. Both
  // inputs are read at runtime from `Constants.expoConfig.extra` and fixed for
  // the process lifetime, so the old top-of-component guard was safe in
  // practice, but not "compile-time" as a previous note claimed.
  const { events, clear } = useEventStore();
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    // Stays inert once we can actually sell — UpsellModal takes the event
    // over, and both must never consume it at once.
    if (purchasesAvailable()) return;
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
  if (purchasesAvailable()) return null;

  return (
    <OutOfStaminaModal
      visible={visible}
      onClose={() => setVisible(false)}
      message={message}
    />
  );
};

export default OutOfStaminaController;
