import { create } from "zustand";

/**
 * OS-owned dialogs that cover the app but are invisible to React.
 *
 * `nativeModal` tracks React Native `<Modal>`s, which is every sheet and dialog
 * we draw ourselves. It cannot see the OS's own alerts — the notification
 * permission prompt above all — because those are presented by the system, not
 * mounted in the tree. Anything that wants to know "does the user actually have
 * a clear view of this screen" has to ask both.
 *
 * DELIBERATELY SEPARATE FROM `nativeModal` rather than another id in its list.
 * That store carries a dev tripwire that warns when two native modals are live
 * at once, because two of them wedge touch input on iOS. An OS alert is not a
 * native `<Modal>` and cannot cause that freeze, so registering it there would
 * fire a warning about a bug that isn't happening — and a tripwire that cries
 * wolf is a tripwire people learn to ignore.
 *
 * Counted, not boolean: two overlapping asks must not have the first one's
 * `end()` declare the screen clear while the second is still up.
 */
interface SystemDialogState {
  /** How many OS dialogs are currently believed to be on screen. */
  depth: number;
  begin: () => void;
  end: () => void;
}

export const useSystemDialogStore = create<SystemDialogState>((set) => ({
  depth: 0,
  begin: () => set((s) => ({ depth: s.depth + 1 })),
  end: () => set((s) => ({ depth: Math.max(0, s.depth - 1) })),
}));
