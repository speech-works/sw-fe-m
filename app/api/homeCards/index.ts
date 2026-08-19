import axiosClient from "../axiosClient";
import type { HomePriorityCardResponse } from "./types";

export type {
  HomePriorityCard,
  HomePriorityCardAction,
  HomePriorityCardResponse,
  HomePriorityCardState,
  NextCardPreview,
} from "./types";

/**
 * The Home priority card.
 *
 * RETURNS NULL ON ANY FAILURE RATHER THAN THROWING, deliberately, following
 * `fetchDailyPlan` in app/api/dailyPlan. This is an optional surface: if the
 * call fails, is slow, or the device is offline, Home must still be perfectly
 * usable. Null and "the server has nothing for you" collapse into the same
 * outcome for the caller — render the Level card — which is exactly right, and
 * means no screen has to hold an error state for a card that is a bonus.
 */
export async function fetchPriorityCard(): Promise<HomePriorityCardResponse | null> {
  try {
    const res = await axiosClient.get("/users/me/priority-card");
    return res.data ?? null;
  } catch (err) {
    console.warn("[homeCards] Could not load the priority card", err);
    return null;
  }
}

/**
 * Tell the server the card was opened, or deliberately skipped.
 *
 * Swallows everything. A failed acknowledgement must never block navigation —
 * the user tapped something and expects to go there. The worst case of losing
 * this call is that the card appears once more, which is a far better failure
 * than a tap that goes nowhere.
 *
 * `skipped` is only ever sent from the modal's own dismiss action. The card
 * itself has no dismiss, so no stray tap can retire a message.
 */
export async function ackPriorityCard(
  cardKey: string,
  reason: "tapped" | "skipped" | "snoozed",
  /**
   * Which choice was taken. Sent only for a snooze, and the server reads the
   * DURATION off the stored card rather than from here, so this identifies the
   * choice without deciding how long it lasts.
   */
  actionId?: string,
): Promise<void> {
  try {
    await axiosClient.post(
      `/users/me/priority-card/${encodeURIComponent(cardKey)}/ack`,
      actionId ? { reason, actionId } : { reason },
    );
  } catch (err) {
    console.warn(`[homeCards] Could not acknowledge "${cardKey}"`, err);
  }
}
