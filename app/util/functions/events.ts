import { useEventStore } from "../../stores/events";

export const dispatchCustomEvent = (eventName: string, detail?: any) => {
  useEventStore.getState().emit(eventName, detail);
};
