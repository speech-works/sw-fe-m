import { useEffect } from "react";
import { useIsFocused } from "@react-navigation/native";

import { useUserStore } from "../stores/user";
import { useNotificationPermissionStore } from "../stores/notificationPermission";
import {
  useOnboardingNudgeStore,
  completedOnboardingToday,
} from "../stores/onboardingNudge";
import { hasOpenModalExcept } from "../stores/nativeModal";
import { useSystemDialogStore } from "../stores/systemDialog";
import { requestNotificationPermissionQuietly } from "../util/functions/notifications";

/**
 * A sentinel that matches nothing in the native-modal registry, so the check
 * below reads as "is ANY native modal open right now". Same device as
 * MoodCheckPopup's POPUP_ID.
 */
const PROMPT_ID = "__notification-permission-ask__";

/** Long enough for Home's cards to settle, short enough to still read as setup. */
const DELAY_MS = 1000;

/**
 * Asks for notification permission once, at the first genuinely quiet moment on
 * Home. Renders nothing — the dialog is the OS's.
 *
 * WHY HERE, AND NOT AT APP LAUNCH. The launch call used to fire this over the
 * pre-auth welcome screen, before the person had signed up, let alone seen what
 * the app does. iOS shows the system dialog exactly once and never again, so
 * that placement spent the only ask we get on a stranger. Here, they have just
 * finished onboarding and reached their own Home.
 *
 * WHY IT MAY ASK ON ONBOARDING DAY. The day someone completes onboarding is
 * otherwise held free of prompts (see MoodCheckPopup, which suppresses itself
 * on that basis). This is the deliberate exception: reminders are the mechanism
 * that brings a person back tomorrow, so deferring the ask to tomorrow is too
 * late for exactly the people who most need them. It is also not one of our
 * sheets — it is the OS's, it is brief, and it is the last step of setting up.
 *
 * WHAT IT WILL NOT DO. It will not stack. If anything else owns the moment it
 * stands down without marking itself asked, and tries again on the next visit
 * to Home. It never re-asks after a real answer, and it never shows an
 * "Open Settings" alert — Settings carries the recovery row for that.
 */
export const NotificationPermissionPrompt: React.FC = () => {
  const user = useUserStore((s) => s.user);
  const hasAsked = useNotificationPermissionStore((s) => s.hasAsked);
  const markAsked = useNotificationPermissionStore((s) => s.markAsked);
  const refresh = useNotificationPermissionStore((s) => s.refresh);

  const hasCompletedOnboarding = user?.hasCompletedOnboarding === true;
  const completedAt = useOnboardingNudgeStore((s) => s.completedAt);
  const isFocused = useIsFocused();

  useEffect(() => {
    if (hasAsked) return;
    // Onboarding is the price of admission for the ask. Home can render before
    // the user object lands, and asking a half-known user is the old bug again.
    if (!hasCompletedOnboarding) return;

    // NOT ON THE DAY THEY FINISHED ONBOARDING — the same rule the mood check
    // follows, and for the same reason.
    //
    // That day already spends everything the person has to give: thirteen
    // questions about what they avoid, then a celebration. The mood check was
    // suppressed so Home would be quiet afterwards, but this was left firing,
    // so a brand-new user still met a system permission dialog about a second
    // after arriving. It was the only thing still interrupting them.
    //
    // A suppression, not a delay: the day is spent, and we ask tomorrow. The
    // cost is real and accepted — no reminder can be scheduled that first
    // evening, because there is no permission yet. Settings still offers the
    // switch to anyone who goes looking.
    if (completedOnboardingToday({ completedAt })) return;

    const timer = setTimeout(() => {
      void (async () => {
        // Stand down rather than queue — see MoodCheckPopup for the reasoning.
        // Nothing is marked, so the next quiet Home visit gets a clean try.
        if (hasOpenModalExcept(PROMPT_ID)) return;

        // ALSO stand down if the user has left Home in the meantime.
        //
        // The check above only sees native modals. A pushed SCREEN is invisible
        // to it, so an OS permission dialog would open on top of whatever they
        // navigated to — which is exactly what "Dress your character" does at
        // the end of onboarding: it lands on Home and immediately opens the
        // Avatar Studio. One second later this fired over it.
        if (!isFocused) return;

        // Marked BEFORE awaiting the dialog, not after: the OS prompt is modal
        // and slow, and a second mount (tab switch, remount) while it is open
        // would otherwise queue a duplicate request behind it.
        markAsked();

        // ANNOUNCE THE OS DIALOG. This one covers the screen without mounting
        // anything, so `nativeModal` cannot see it and neither can anybody
        // asking that store whether the user has a clear view of Home. On iOS
        // the system alert also drops AppState to "inactive", which would catch
        // it — but Android does not reliably do the same, and a one-shot
        // animation firing behind this dialog is spent for good. Say so
        // explicitly rather than inferring it.
        const { begin, end } = useSystemDialogStore.getState();
        begin();
        try {
          await requestNotificationPermissionQuietly();
        } finally {
          end();
        }
        // Whatever they chose, the row and the dot read from this.
        await refresh();
      })();
    }, DELAY_MS);

    return () => clearTimeout(timer);
  }, [hasAsked, hasCompletedOnboarding, completedAt, isFocused, markAsked, refresh]);

  return null;
};

export default NotificationPermissionPrompt;
