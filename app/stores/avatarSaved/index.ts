import { create } from "zustand";

/**
 * A one-shot handoff from the Avatar Studio to Home: "they just saved a new
 * avatar — greet it."
 *
 * Its own store, and NOT `avatarDraft`, because that one is persisted. A flag
 * saying "something just happened" must never survive an app restart; if it
 * did, somebody who saved an avatar and killed the app would be shown a
 * celebration for it days later, about nothing.
 *
 * CONSUME, don't read. `take()` returns the flag and clears it in the same
 * call, so the greeting can only ever play once per save no matter how many
 * times Home is focused, remounted, or pull-to-refreshed afterwards. A plain
 * boolean + a separate clear() would leave a window where two readers both see
 * true, and Home's cards are exactly the kind of thing that re-renders twice.
 */
interface AvatarSavedState {
  /** Set the moment a save succeeds. Read only through `take()`. */
  pending: boolean;
  /** Called by the studio after `updateMyUser` resolves. */
  mark: () => void;
  /** Returns whether a save is waiting to be greeted, and clears it. */
  take: () => boolean;
}

export const useAvatarSavedStore = create<AvatarSavedState>((set, get) => ({
  pending: false,
  mark: () => set({ pending: true }),
  take: () => {
    const was = get().pending;
    if (was) set({ pending: false });
    return was;
  },
}));
