import { getUserOnboardingAnswers } from "../../api/onboarding";
import type { OnboardingFlow, UserAnswerMap } from "../../api/onboarding/types";

/**
 * Fetch the account's answers from the server, so "what's left" is decided by
 * the only copy that outlives the device.
 *
 * WHY THE SERVER AND NOT THE LOCAL STORE. The resume point used to be derived
 * from local state alone, which fails in every case where the device is not the
 * same device: a reinstall, a second phone, a cleared store — each one re-asked
 * questions the server already had. It also fails on a SHARED phone, where the
 * local copy can belong to somebody else entirely.
 *
 * BEST EFFORT, ALWAYS. Every failure resolves to `null` and the caller falls
 * back to local answers. The worst case is re-asking a question the server
 * already knows, which the backend blind-merges harmlessly. Blocking entry to
 * onboarding on a network call would be a far worse trade.
 */

/** Picks the record that belongs to THIS flow, not merely the newest one. */
export function pickAnswersForFlow(
  records: { flow?: { version?: string }; answers?: UserAnswerMap }[],
  flowVersion: string | undefined,
): UserAnswerMap | null {
  if (!records?.length) return null;

  // VERSION FIRST, RECENCY SECOND. The endpoint returns every record the user
  // has, across flow versions, newest first. Merging a v1.0 record into the
  // v2.0 flow re-creates precisely the unreadable-answer failure that
  // `answersAreReadable` exists to catch — an old answer whose value this flow
  // no longer offers would be counted as "answered" and its question skipped.
  const match = flowVersion
    ? records.find((r) => r.flow?.version === flowVersion)
    : undefined;

  const chosen = match ?? records[0];
  const answers = chosen?.answers;
  return answers && Object.keys(answers).length > 0 ? answers : null;
}

export async function loadServerOnboardingAnswers(
  userId: string | undefined,
  flow: OnboardingFlow | null,
): Promise<UserAnswerMap | null> {
  if (!userId) return null;

  try {
    const records = await getUserOnboardingAnswers(userId);
    return pickAnswersForFlow(records ?? [], flow?.version);
  } catch (err) {
    // Deliberately swallowed: see the best-effort note above. The caller still
    // has local answers, and `answersAreReadable` guards what they're worth.
    console.warn(
      "[onboarding] could not read the account's answers; using local state:",
      err,
    );
    return null;
  }
}
