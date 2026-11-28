import { create } from "zustand";
import * as Notifications from "expo-notifications";

/**
 * Our own ask, shown BEFORE the phone's notification dialog.
 *
 * The OS dialog can be shown once; a "no" there is final on iOS. So we ask first in our own words, with Pip and the polite
 * bell, and only a "yes" goes on to the OS dialog. "Not now" costs nothing: the OS has not been asked and can be later.
 */

/** Pure: would the OS really show its dialog? Only then is our ask worth showing. */
export const needsInAppAsk = (s: { granted?: boolean; canAskAgain?: boolean; ios?: { status?: number } }): boolean => {
  const granted = s.granted === true || s.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
  return !granted && s.canAskAgain === true;
};

interface AskState {
  open: boolean;
  /** True while NotificationAsk is mounted. Without it nothing can show, so the ask is skipped. */
  hostMounted: boolean;
  resolve: ((allow: boolean) => void) | null;
  setHostMounted: (v: boolean) => void;
  answer: (allow: boolean) => void;
}

export const useNotificationAskStore = create<AskState>((set, get) => ({
  open: false,
  hostMounted: false,
  resolve: null,
  setHostMounted: (hostMounted) => set({ hostMounted }),
  answer: (allow) => {
    const { resolve } = get();
    // "Allow" closes the sheet now; "Not now" keeps it open while the bell dozes, and the host closes it later.
    set({ resolve: null, ...(allow ? { open: false } : {}) });
    resolve?.(allow);
  },
}));

/** Closes the sheet after a "Not now" (the host calls it once the bell has dozed). */
export const closeNotificationAsk = () => useNotificationAskStore.setState({ open: false });

let pending: Promise<boolean> | null = null;

/**
 * Shows our ask when the OS would prompt. Resolves true when the person may now be asked by the OS: they tapped "Allow", or
 * no ask was needed or possible (already decided, no screen to show it on). Resolves false after "Not now".
 * Callers: `if (!(await askNotificationsNicely())) return;` before their own OS request. A second call while one is
 * open shares the same answer.
 */
export async function askNotificationsNicely(): Promise<boolean> {
  try {
    if (pending) return await pending;
    if (!useNotificationAskStore.getState().hostMounted) return true;
    const settings = await Notifications.getPermissionsAsync();
    if (!needsInAppAsk(settings)) return true;
    pending = new Promise<boolean>((resolve) => useNotificationAskStore.setState({ open: true, resolve }));
    return await pending;
  } catch (error) {
    // Our ask failing must never block the real request.
    console.warn("[Push] in-app ask failed:", error);
    return true;
  } finally {
    pending = null;
  }
}
