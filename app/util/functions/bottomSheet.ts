import { EVENT_NAMES } from "../../stores/events/constants";
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
) => {
  dispatchCustomEvent(EVENT_NAMES.SHOW_SUCCESS_MODAL, {
    title,
    message: desc,
    primaryAction,
    dismissLabel,
  });
};
