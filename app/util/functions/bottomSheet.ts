import { EVENT_NAMES } from "../../stores/events/constants";
import { haptics } from "../../design-system/haptics";
import { dispatchCustomEvent } from "./events";

/** Replaces the single "Got it" dismiss with a primary action (e.g. deep-link
 *  to Settings) plus a secondary dismiss — for errors that have a real fix
 *  available right now, not just an acknowledgement. */
export interface BottomSheetAction {
  label: string;
  onPress: () => void;
}

export const showErrorBottomSheet = (
  title: string,
  desc: string,
  primaryAction?: BottomSheetAction,
  dismissLabel?: string,
) => {
  // The one buzz worth keeping on an ordinary screen. Something failed, the
  // person may already be looking away, and this is the app's single door for
  // every error, so it stays in one place and cannot spread.
  haptics.error();
  dispatchCustomEvent(EVENT_NAMES.SHOW_ERROR_MODAL, {
    title,
    message: desc,
    primaryAction,
    dismissLabel,
  });
};

/** Mirrors the error variant's action support — OutcomeModal already renders
 *  `primaryAction`/`dismissLabel` on the success branch; only this helper
 *  failed to expose them. Use it for a success that has an obvious next step. */
export const showSuccessBottomSheet = (
  title: string,
  desc: string,
  primaryAction?: BottomSheetAction,
  dismissLabel?: string,
  /** `dimBackdrop`: keep the screen behind visible under a dim scrim, the way
   *  the store's own sheet does, instead of the opaque backdrop. */
  options?: { dimBackdrop?: boolean },
) => {
  dispatchCustomEvent(EVENT_NAMES.SHOW_SUCCESS_MODAL, {
    title,
    message: desc,
    primaryAction,
    dismissLabel,
    dimBackdrop: options?.dimBackdrop === true,
  });
};

/** A success with nothing to decide: no button, and it closes by itself. */
export const showSavedBottomSheet = (title: string, desc: string) => {
  dispatchCustomEvent(EVENT_NAMES.SHOW_SUCCESS_MODAL, {
    title,
    message: desc,
    autoClose: true,
  });
};
