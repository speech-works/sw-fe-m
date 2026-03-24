import { EVENT_NAMES } from "../../stores/events/constants";
import { dispatchCustomEvent } from "./events";

export const showErrorBottomSheet = (title: string, desc: string) => {
  dispatchCustomEvent(EVENT_NAMES.SHOW_ERROR_MODAL, {
    title,
    message: desc,
  });
};

export const showSuccessBottomSheet = (title: string, desc: string) => {
  dispatchCustomEvent(EVENT_NAMES.SHOW_SUCCESS_MODAL, {
    title,
    message: desc,
  });
};
