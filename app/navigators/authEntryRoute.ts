import type { AuthStackParamList } from "./AuthNavigator";

/**
 * Which screen the logged-out half of the app opens on.
 *
 * ITS OWN MODULE so it can be asserted without mounting a navigator — the same
 * reason `normalizeReminderDate` and `pickAnswersForFlow` were lifted out.
 * Importing AuthNavigator drags in every pre-auth screen and their native deps;
 * this is the only part of that file that makes a decision, and it is the part
 * that shipped a bug.
 */
export function pickAuthEntryRoute(state: {
  /** The PRE_AUTH_ONBOARDING_ENABLED runtime flag. */
  preAuthEnabled: boolean;
  /** `completedAt` from the on-device Act 1 draft — set at the last question,
   *  cleared only after a successful post-signup replay. */
  draftCompleted: string | null;
}): keyof AuthStackParamList {
  // Flag off: the old login-first app, exactly as it was before Act 1.
  if (!state.preAuthEnabled) return "Auth";

  // Answered everything but never made an account. They get their own result
  // back, not a login wall — see the long note in AuthNavigator for why this
  // case used to route to "Auth" and why that was wrong.
  if (state.draftCompleted) return "ActOneTeaser";

  return "ActOneWelcome";
}
