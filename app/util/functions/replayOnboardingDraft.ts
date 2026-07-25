import {
  getActiveOnboardingFlow,
  submitOnboardingAnswers,
} from "../../api/onboarding";
import { useOnboardingDraftStore } from "../../stores/onboardingDraft";
import { useOnboardingStore } from "../../stores/onboarding";

/**
 * Hand the pre-signup answers to the server, once, after an account exists.
 *
 * Act 1's five answers are held on the device — there was no account to attach
 * them to, and they are health-adjacent, so nothing was transmitted. The moment
 * someone signs up that changes, and this is the handover.
 *
 * WHY IT DOES NOT LIVE ON THE AUTH SCREEN: `login()` inside
 * `processAuthRedirect` flips `isLoggedIn`, MainNavigator swaps the whole
 * navigator out, and every line after that is running on an unmounted
 * component. Anything attached there dies mid-flight — the existing
 * `attachInviteCode` call already has that problem. So this is invoked from an
 * effect in MainNavigator, which outlives the transition.
 *
 * Safe to call repeatedly: it is a no-op once there is nothing pending.
 */
export async function replayOnboardingDraft(): Promise<
  "replayed" | "nothing-to-do" | "failed"
> {
  const draft = useOnboardingDraftStore.getState();

  if (!draft.hasPendingReplay()) return "nothing-to-do";

  const answers = draft.answers;

  try {
    await submitOnboardingAnswers({ answers });

    // Mark BEFORE the resume seeding below: the answers are safely on the
    // server at this point, and a failure in the (cosmetic) seeding must not
    // cause them to be sent a second time on the next app open.
    useOnboardingDraftStore.getState().markReplayed();

    // Carry them into the post-signup flow so it continues at the first
    // unanswered question rather than reasking all five. Best-effort: if the
    // flow can't be fetched the person just starts at question one, which is
    // mildly annoying but never wrong — the server already has their answers.
    try {
      const flow = await getActiveOnboardingFlow();
      useOnboardingStore.getState().resumeFrom(flow, answers);
    } catch (err) {
      console.warn(
        "[onboarding] replayed, but could not seed the resume point:",
        err,
      );
    }

    // Only now discard the local copy.
    useOnboardingDraftStore.getState().clear();
    return "replayed";
  } catch (err) {
    // Deliberately NOT swallowed, and `replayedAt` deliberately left null so
    // the next app open tries again. Losing these silently would mean someone
    // answered five questions and still got a generic recommendation.
    console.error("[onboarding] failed to replay pre-signup answers:", err);
    return "failed";
  }
}
