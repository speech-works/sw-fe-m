import {
  getActiveOnboardingFlow,
  submitOnboardingAnswers,
} from "../../api/onboarding";
import { useOnboardingDraftStore } from "../../stores/onboardingDraft";
import { useOnboardingStore } from "../../stores/onboarding";
import { loadServerOnboardingAnswers } from "./loadServerOnboardingAnswers";

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
export async function replayOnboardingDraft(
  userId?: string,
): Promise<"replayed" | "nothing-to-do" | "failed"> {
  const draft = useOnboardingDraftStore.getState();

  if (!draft.hasPendingReplay()) return "nothing-to-do";

  // NEVER OVERWRITE WHAT THE ACCOUNT ALREADY KNOWS.
  //
  // This runs from a MainNavigator effect keyed on [isLoggedIn, userId], so it
  // fires on ANY login — and no signal distinguishing a new account from a
  // returning one exists anywhere in either repo. Combined with a server that
  // blind-merges (`record.answers = {...record.answers, ...answers}`), that
  // made the on-device draft authoritative over whoever signed in next:
  //
  //   - The reported bug: a leftover draft from an earlier session on this
  //     phone was replayed into a brand-new account, so Act 1 looked answered
  //     and the flow opened on Act 2.
  //   - The worse one: log out, tap through the pre-signup questions, log back
  //     in — and an established user's situations, goal and DISTRESS (the
  //     safety signal) are silently replaced. On a shared phone those answers
  //     can be a different person's.
  //
  // Fixing it by asking "is this a new account?" would be the wrong guard: a
  // returning user on a second device is not new and legitimately has a draft.
  // The right question is whether the ACCOUNT has already answered, which needs
  // no new endpoint and covers both cases.
  let answers = draft.answers;
  // What the flow should RESUME from — the whole picture, account plus draft.
  // `answers` narrows to just the keys we're allowed to send; seeding the
  // resume point from that alone would look like the account had answered only
  // those, and park the person on a question they had already done.
  let seedAnswers: Record<string, any> = draft.answers;

  if (userId) {
    try {
      const flow = await getActiveOnboardingFlow().catch(() => null);
      const existing = await loadServerOnboardingAnswers(userId, flow);

      if (existing && Object.keys(existing).length > 0) {
        // Account wins on every key it already holds; the draft only fills gaps.
        seedAnswers = { ...answers, ...existing };

        const fresh = Object.fromEntries(
          Object.entries(answers).filter(([key]) => !(key in existing)),
        );

        if (Object.keys(fresh).length === 0) {
          // The account already knows everything this draft holds. Discard it
          // rather than re-POSTing: an identical submit still costs a write,
          // and the draft has outlived its purpose.
          useOnboardingDraftStore.getState().markReplayed();
          useOnboardingDraftStore.getState().clear();
          return "nothing-to-do";
        }
        answers = fresh;
      }
    } catch (err) {
      // Best effort. If we cannot read the account we do NOT fall through to
      // overwriting it — that is the whole point of this guard.
      console.warn(
        "[onboarding] could not check the account's answers; skipping replay:",
        err,
      );
      return "failed";
    }
  }

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
      useOnboardingStore.getState().resumeFrom(flow, seedAnswers);
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
