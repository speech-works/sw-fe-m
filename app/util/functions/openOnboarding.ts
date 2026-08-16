import { getActiveOnboardingFlow } from "../../api/onboarding";
import { useOnboardingStore } from "../../stores/onboarding";
import { useEventStore } from "../../stores/events";
import { EVENT_NAMES } from "../../stores/events/constants";
import { useUserStore } from "../../stores/user";
import { loadServerOnboardingAnswers } from "./loadServerOnboardingAnswers";
import { showErrorBottomSheet } from "./bottomSheet";
import { apiErrorMessage } from "./apiError";
import { track } from "../analytics/postHog";
import { ANALYTICS_EVENTS } from "../analytics/analyticsEvents";

/**
 * The ONE way to open onboarding from inside the app.
 *
 * There were six, and they disagreed with each other:
 *   - Home's card fetched the flow, sometimes called `startFresh`, and offered a
 *     Resume/Start-Over choice.
 *   - The Programs CTA guarded BOTH its fetch and its `startFresh` behind
 *     `if (!state.flow)` — and `flow` is persisted, so for any returning user
 *     that CTA silently dropped them mid-flow at a stale position.
 *   - DailyPractice's "Complete Profile" emitted the event bare: no fetch, no
 *     store preparation, no error handling at all.
 *   - Two more came from the resume modal, and one from the auto-latch.
 * Same intent, four different behaviours, and the two that skipped the fetch
 * relied on a screen that had no error UI.
 *
 * Everything now funnels through here: fetch, cache the flow, pull the account's
 * answers, then hand over. The resume POINT is still derived inside
 * `enterFlow`, on the welcome screen — this only guarantees that screen has
 * what it needs.
 */
export async function openOnboarding(
  source:
    | "home_card"
    | "programs"
    | "daily_practice"
    | "discoverability"
    | "discover",
): Promise<void> {
  try {
    const flow = await getActiveOnboardingFlow();

    // Warm the store with the flow AND the account's answers, so the welcome
    // screen already holds the truth before it computes a resume point. Its own
    // fetch then confirms rather than discovers — and if that one fails,
    // `enterFlow` still has the server's answers locally instead of falling
    // back to a possibly-empty device copy.
    //
    // (An earlier version fetched the answers here and discarded the result,
    // which was a wasted round trip on every card tap.)
    const userId = useUserStore.getState().user?.id;
    const serverAnswers = await loadServerOnboardingAnswers(userId, flow);
    useOnboardingStore
      .getState()
      .hydrateFromServer(flow, serverAnswers ?? undefined);

    track(ANALYTICS_EVENTS.ONBOARDING_STARTED, { source });
    useEventStore.getState().emit(EVENT_NAMES.START_ONBOARDING);
  } catch (err) {
    // Previously a bare console.error at every call site, which made the card
    // and both CTAs look simply inert when offline — a tap that does nothing,
    // with nothing to explain it.
    console.error("[onboarding] could not open the flow:", err);
    showErrorBottomSheet(
      "We couldn't open your questions",
      apiErrorMessage(err, "Check your connection and try again."),
    );
  }
}
