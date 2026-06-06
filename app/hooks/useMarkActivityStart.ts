import {
  createPracticeActivity,
  createPracticeActivityFromPack,
  startPracticeActivity,
} from "../api";
import { PracticeActivityContentType } from "../api/practiceActivities/types";
import { useActivityStore } from "../stores/activity";
import { useSessionStore } from "../stores/session";
import { useUserStore } from "../stores/user";
import { track } from "../util/analytics/postHog";
import { ANALYTICS_EVENTS } from "../util/analytics/analyticsEvents";
import { showErrorBottomSheet } from "../util/functions/bottomSheet";

interface UseMarkActivityStartParams {
  /** The content type for the activity (READING_PRACTICE, EXPOSURE_PRACTICE, etc.) */
  contentType: PracticeActivityContentType;
  /** ID of the content item (reading practice ID, scenario ID, etc.) */
  contentId: string | undefined;
  /** Title for analytics tracking */
  contentTitle: string | undefined;
  /** Pre-started activity from pack navigation (route.params.practiceActivity) */
  initialActivity: any | undefined;
  /** Pack context from route params */
  packContext: any;
  /** Current activity ID state */
  currentActivityId: string | null;
  /** Setter for activity ID — can be plain setState or a ref-syncing wrapper */
  setActivityId: (id: string | null) => void;
  /** Called on early-exit error paths (e.g., to reset isStarting). Optional. */
  onEarlyExit?: () => void;
  /** Navigation object for error recovery (goBack) */
  navigation: { canGoBack: () => boolean; goBack: () => void };
  /** A tag for console logs, e.g. "useStoryPractice" */
  logTag: string;
}

/**
 * Shared hook that encapsulates the activity-start lifecycle:
 *   1. Ensure an active session (or use pack context)
 *   2. Handle double-start prevention for pack-launched activities
 *   3. Create the practice activity (standalone or pack)
 *   4. Retry on stale-session 404
 *   5. Start the activity via API
 *   6. Track analytics
 *
 * Returns the started activity ID, or null on failure. Never throws.
 */
export const useMarkActivityStart = (
  params: UseMarkActivityStartParams,
): (() => Promise<string | null>) => {
  const { addActivity } = useActivityStore();
  const { practiceSession, setSession, ensureActiveSession } =
    useSessionStore();
  const { user } = useUserStore();

  const {
    contentType,
    contentId,
    contentTitle,
    initialActivity,
    packContext,
    currentActivityId,
    setActivityId,
    onEarlyExit,
    navigation,
    logTag,
  } = params;

  const markActivityStart = async (): Promise<string | null> => {
    const isPackContext = packContext?.packId;

    if (!isPackContext && !practiceSession && !user) {
      console.error(`[${logTag}] ❌ No user/session found!`);
      return null;
    }

    let sessionToUse = practiceSession;

    // Ensure we have an active session (standalone mode)
    if (!isPackContext && !sessionToUse && user) {
      try {
        const newSession = await ensureActiveSession(user.id);
        setSession(newSession);
        sessionToUse = newSession;
      } catch (err) {
        console.error(`[${logTag}] Failed to ensure active session`, err);
        return null;
      }
    }

    if (!isPackContext && !sessionToUse) return null;

    try {
      const sessionId = isPackContext ? undefined : sessionToUse!.id;
      const userId = isPackContext
        ? user?.id
        : (sessionToUse!.user?.id ?? user?.id);

      if (!userId) {
        console.error(`[${logTag}] Missing userId`);
        return null;
      }

      let activityIdToStart = currentActivityId || initialActivity?.id;

      // --- DOUBLE-START PREVENTION ---
      if (packContext?.alreadyStarted) {
        if (initialActivity) {
          console.log(
            `>> ${logTag}: Activity already started by Pack, skipping API call...`,
          );
          addActivity(initialActivity);
          useUserStore.getState().fetchUser();
          setActivityId(initialActivity.id);
          return initialActivity.id;
        } else {
          console.error(
            "FATAL: Pack marked activity as started, but initialActivity is missing!",
          );
          onEarlyExit?.();
          showErrorBottomSheet(
            "Something went wrong",
            "Activity data was lost. Returning to your Pack.",
          );
          if (navigation.canGoBack()) {
            navigation.goBack();
          }
          return null;
        }
      }

      // If we don't have a unique activity ID yet, create one
      if (!activityIdToStart) {
        if (!contentId) {
          console.error(
            `${logTag} - Missing contentId, cannot create activity. User might be attempting to start before data is loaded.`,
          );
          onEarlyExit?.();
          return null;
        }

        if (isPackContext) {
          console.log(`${logTag} - Creating Activity via POST (Pack)`);
          const newActivity = await createPracticeActivityFromPack({
            packId: packContext.packId,
            moduleId: packContext.moduleId,
            contentType,
            contentId,
          });
          activityIdToStart = newActivity.id;
        } else {
          if (!sessionId) {
            console.error(`[${logTag}] No session ID for standalone activity`);
            return null;
          }
          console.log(`${logTag} - Creating Activity via POST (Standalone)`);
          let newActivity;
          try {
            newActivity = await createPracticeActivity({
              sessionId,
              contentType,
              contentId,
            });
          } catch (createErr: any) {
            if (
              createErr?.response?.status === 404 &&
              createErr?.response?.data?.error
                ?.toLowerCase()
                .includes("session")
            ) {
              console.log(
                `>> ${logTag}: Stale session detected (404), refreshing...`,
              );
              sessionToUse = await ensureActiveSession(userId, true);
              newActivity = await createPracticeActivity({
                sessionId: sessionToUse.id,
                contentType,
                contentId,
              });
            } else {
              throw createErr;
            }
          }
          activityIdToStart = newActivity.id;
        }
      }

      const startedActivity = await startPracticeActivity({
        id: activityIdToStart,
        userId,
      });

      addActivity({ ...startedActivity });

      // Track activity start
      track(ANALYTICS_EVENTS.ACTIVITY_STARTED, {
        activityId: activityIdToStart,
        contentType,
        ...(contentTitle ? { title: contentTitle } : {}),
        isPackContext: !!packContext?.packId,
      });

      useUserStore.getState().fetchUser();
      setActivityId(activityIdToStart);
      return activityIdToStart;
    } catch (error) {
      console.error(`[${logTag}] ❌ Error in markActivityStart:`, error);
      return null;
    }
  };

  return markActivityStart;
};
