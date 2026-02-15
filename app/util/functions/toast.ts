import { EVENT_NAMES } from "../../stores/events/constants";
import { dispatchCustomEvent } from "./events";

export const triggerToast = (type: string, title: string, desc: string) => {
  const eventName =
    type.toLowerCase() === "success"
      ? EVENT_NAMES.SHOW_SUCCESS_MODAL
      : EVENT_NAMES.SHOW_ERROR_MODAL;

  dispatchCustomEvent(eventName, {
    title,
    message: desc,
  });
};
