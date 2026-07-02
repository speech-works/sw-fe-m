import React, { useCallback, useEffect, useRef, useState } from "react";
import PromptBottomSheet from "../components/PromptBottomSheet";
import type { PackContext } from "../utils/packActivityNavigation";
import { useActivityStore } from "../stores/activity";

/**
 * Which landing the user returns to when they DISCARD an unfinished practice.
 * Resolved from a STATIC family the screen knows about itself — never inferred
 * from stack ancestry (some practice screens are registered twice: in their
 * family sub-stack AND directly in ExploreStack, so ancestry is unreliable).
 */
type ExitFamily =
  | "Reading"
  | "Fun"
  | "Exposure"
  | "Cognitive"
  | "Explore"; // Real-Life Challenge has no family landing → Explore

/** Minimal navigation surface we need (screens pass their useNavigation()). */
interface MinimalNavigation {
  addListener: (type: "beforeRemove", cb: (e: any) => void) => () => void;
  navigate: (...args: any[]) => void;
  dispatch: (action: any) => void;
}

interface UseConfirmOnExitParams {
  navigation: MinimalNavigation;
  /**
   * The started PracticeActivity id (null/undefined if not started). The hook
   * derives "is active" from this AND reads the activity's terminal status from
   * the store at back-press time — so a completion/abort handler that navigates
   * away in the same synchronous tick (before the screen's done flag re-renders)
   * is NOT wrongly intercepted.
   */
  activityId: string | null | undefined;
  /**
   * The screen's "done" flag. When true, exit is free (already saved). May be a
   * boolean (reactive state) OR a getter evaluated at back-press time — use the
   * getter form when completion is tracked outside React state (e.g. a module
   * flag), so the listener reads the live value without needing a re-render.
   */
  isCompleted: boolean | (() => boolean);
  /**
   * The screen's EXISTING completion handler — the same one the in-screen
   * Done/Submit/Continue button calls (including any vitals/feedback modal it
   * opens). Reused so there is exactly one completion path per activity.
   */
  onSave: () => void | Promise<void>;
  /** Static family for the Discard destination (see ExitFamily). */
  family: ExitFamily;
  /** Entry origin (e.g. "HOME" | "EXPLORE" | "MOOD_CHECK"), for parity with the existing onDone destinations. */
  from?: string;
  /** Pack context, if launched from a pack — reuses the existing PackModule destination. */
  packContext?: PackContext | null;
  accentColor?: string;
  onAccentColor?: string;
}

/**
 * Resolve and navigate to the Discard destination. Uses fully-qualified nested
 * navigation so it works regardless of which route ancestry the user entered
 * through (family sub-stack OR the parallel ExploreStack direct registration).
 */
function navigateToExit(
  navigation: MinimalNavigation,
  { family, from, packContext }: Pick<UseConfirmOnExitParams, "family" | "from" | "packContext">,
) {
  if (packContext?.packId) {
    navigation.navigate("PackModule", {
      packId: packContext.packId,
      moduleId: packContext.moduleId,
      initialBlockIndex: packContext.blockIndex,
    });
    return;
  }
  if (from === "MOOD_CHECK") {
    navigation.navigate("Root", { screen: "HOME" });
    return;
  }
  switch (family) {
    case "Reading":
      navigation.navigate("DailyPracticeStack", {
        screen: "ReadingPracticeStack",
        params: { screen: "ReadingPractice" },
      });
      break;
    case "Fun":
      navigation.navigate("DailyPracticeStack", {
        screen: "FunPracticeStack",
        params: { screen: "FunPractice" },
      });
      break;
    case "Exposure":
      navigation.navigate("DailyPracticeStack", {
        screen: "ExposureStack",
        params: { screen: "Exposure" },
      });
      break;
    case "Cognitive":
      navigation.navigate("DailyPracticeStack", {
        screen: "CognitivePracticeStack",
        params: { screen: "CognitivePractice" },
      });
      break;
    case "Explore":
    default:
      navigation.navigate("Explore");
      break;
  }
}

/**
 * Confirm-on-exit for a practice activity. Mount once per practice route.
 *
 * When the user tries to LEAVE (hardware back, in-screen back chevron via
 * goBack, or any programmatic pop) while the activity is started but not yet
 * completed, it intercepts the navigation and shows a styled "Save this
 * practice?" sheet:
 *   - Save & Finish → runs the screen's existing completion flow (lands on its
 *     in-place done view; vitals modal runs where the activity has one).
 *   - Discard       → leaves to the family landing (no completion, NO refund).
 *   - Keep practicing (X / backdrop) → stay.
 *
 * Pair with `gestureEnabled: false` on the activity route so the iOS swipe
 * gesture can't bypass the intercept. Returns an element to render in the tree.
 */
export function useConfirmOnExit({
  navigation,
  activityId,
  isCompleted,
  onSave,
  family,
  from,
  packContext,
  accentColor,
  onAccentColor,
}: UseConfirmOnExitParams): { exitSheet: React.ReactElement } {
  const isActive = !!activityId;
  const [visible, setVisible] = useState(false);
  // Latch so the Save/Discard navigation isn't re-intercepted by the listener.
  const allowLeave = useRef(false);
  // The intercepted back action, replayed on Discard so the active screen is
  // actually popped (instead of navigating over it and leaking it on the stack).
  const pendingActionRef = useRef<any>(null);

  // Keep the latest isCompleted + activityId in refs so the beforeRemove listener
  // reads the CURRENT value at back-press time. Required for completion tracked
  // outside React state (Mirror Work's module flag) and for the live store check.
  const isCompletedRef = useRef(isCompleted);
  isCompletedRef.current = isCompleted;
  const activityIdRef = useRef(activityId);
  activityIdRef.current = activityId;
  const resolveCompleted = () => {
    const v = isCompletedRef.current;
    if (typeof v === "function" ? v() : !!v) return true;
    // The activity reached a terminal state in the store (completed OR aborted —
    // via completedAt OR a terminal status, so we don't hinge on a single nullable
    // field). Covers completion/abort handlers that navigate away in the same
    // synchronous tick, before the screen's done flag re-renders.
    const id = activityIdRef.current;
    if (!id) return false;
    const act = useActivityStore
      .getState()
      .activities.find((a) => a.id === id);
    return (
      !!act &&
      (!!act.completedAt ||
        act.status === "COMPLETED" ||
        act.status === "ABORTED")
    );
  };

  useEffect(() => {
    const unsub = navigation.addListener("beforeRemove", (e: any) => {
      // Guards: not started / already saved / leave already authorized → let it go.
      if (!isActive || resolveCompleted() || allowLeave.current) return;
      pendingActionRef.current = e.data?.action ?? null;
      e.preventDefault();
      setVisible(true);
    });
    return unsub;
    // isCompleted is read via the ref/getter at fire time (it is not referenced
    // directly in this effect), so it is intentionally not a dependency.
  }, [navigation, isActive]);

  const handleSave = useCallback(() => {
    // The sheet closes via onClose; defer the completion so the prompt finishes
    // animating out before any vitals/feedback modal mounts (avoids the iOS
    // back-to-back-modal freeze). onSave flips the screen's done flag, so a
    // subsequent back is passed through by the isCompleted guard.
    setTimeout(() => {
      void onSave();
    }, 400);
  }, [onSave]);

  const handleDiscard = useCallback(() => {
    allowLeave.current = true;
    // Pack- and mood-launched practices have an explicit cross-stack destination
    // (PackModule / Home), so keep navigating there.
    if (packContext?.packId || from === "MOOD_CHECK") {
      navigateToExit(navigation, { family, from, packContext });
      return;
    }
    // Otherwise replay the genuine back the user requested. This POPS the active
    // practice screen (landing on its natural parent — the family hub on the
    // normal entry path) with a clean stack, instead of navigating over it and
    // leaving it behind. Fall back to the explicit family landing if the
    // intercepted action is unavailable.
    const action = pendingActionRef.current;
    if (action) navigation.dispatch(action);
    else navigateToExit(navigation, { family, from, packContext });
  }, [navigation, family, from, packContext]);

  const exitSheet = (
    <PromptBottomSheet
      visible={visible}
      onClose={() => setVisible(false)}
      title="Save this practice?"
      message="You haven't finished this practice yet. Save your progress to keep it, or discard this attempt."
      icon="content-save-outline"
      primaryButton={{ label: "Save & Finish", onPress: handleSave }}
      secondaryButton={{ label: "Discard", onPress: handleDiscard }}
      accentColor={accentColor}
      onAccentColor={onAccentColor}
    />
  );

  return { exitSheet };
}
