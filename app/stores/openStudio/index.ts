import { create } from "zustand";

/**
 * A one-shot request from the end of onboarding: "open the Avatar Studio once
 * you are in the app."
 *
 * IT EXISTS BECAUSE THE BUTTON CANNOT SIMPLY NAVIGATE. `AvatarStudio` is a
 * screen on `AppNavigator`, and the last onboarding screen lives on
 * `OnboardingStackNavigator`, which MainNavigator swaps OUT the moment
 * onboarding is marked complete. There is no route from one to the other: the
 * destination does not exist yet when the button is pressed. So the press
 * records an intent, finishing onboarding proceeds exactly as it always has,
 * and whoever lands first in the new navigator honours it.
 *
 * Modelled on `avatarSaved`, and NOT persisted for the same reason: an intent
 * that outlived an app restart would yank somebody into the wardrobe days later
 * for a button they pressed once and forgot.
 *
 * CONSUME, don't read. `take()` returns the intent and clears it in one call,
 * so a screen that focuses twice cannot navigate twice.
 */
interface OpenStudioState {
  pending: boolean;
  /** Called by the onboarding CTA, before it finishes onboarding. */
  mark: () => void;
  /** Returns whether the studio was asked for, and clears the request. */
  take: () => boolean;
}

export const useOpenStudioStore = create<OpenStudioState>((set, get) => ({
  pending: false,
  mark: () => set({ pending: true }),
  take: () => {
    const was = get().pending;
    if (was) set({ pending: false });
    return was;
  },
}));
