import { useEffect, useId } from "react";
import { create } from "zustand";

/**
 * Native-modal presence registry.
 *
 * Two live React Native `<Modal>`s on screen at once wedge all touch input on
 * iOS (see the "stacked native Modal freeze" note). There is no way to stack
 * them safely, so this store tracks which native modals are currently mounted so
 * that an `exclusive` modal can DEFER presenting until the screen is clear.
 *
 * Almost every native modal funnels through `AnimatedModal` / `Sheet`, which
 * register here automatically; the handful of raw `<Modal>` users register via
 * {@link useRegisterNativeModal}.
 */
interface NativeModalState {
  /** Ids of native modals currently mounted (visible or animating). */
  openIds: string[];
  register: (id: string) => void;
  unregister: (id: string) => void;
}

export const useNativeModalStore = create<NativeModalState>((set) => ({
  openIds: [],
  register: (id) =>
    set((state) => {
      if (state.openIds.includes(id)) return state;
      const openIds = [...state.openIds, id];
      if (__DEV__ && openIds.length >= 2) {
        // Regression tripwire: if this fires, two native modals are live at once
        // (outside a brief hand-off) — one of them should be `exclusive`, or the
        // other closed first. Transient overlaps during a modal swap are benign.
        console.warn(
          `[NativeModal] ${openIds.length} native <Modal>s mounted at once: ` +
            `[${openIds.join(", ")}]. Two live native modals freeze touch input ` +
            `on iOS — mark one 'exclusive' or dismiss the other first.`,
        );
      }
      return { openIds };
    }),
  unregister: (id) =>
    set((state) =>
      state.openIds.includes(id)
        ? { openIds: state.openIds.filter((x) => x !== id) }
        : state,
    ),
}));

/** True if a native modal OTHER than `selfId` is currently open. */
export function hasOpenModalExcept(selfId: string): boolean {
  return useNativeModalStore.getState().openIds.some((id) => id !== selfId);
}

/**
 * Register a native `<Modal>` presence while `active` is true (and clean up on
 * `active=false` / unmount). Returns a stable id. Use in raw `<Modal>` users —
 * `AnimatedModal` / `Sheet` register imperatively so `exclusive` deferral can be
 * serialized, so they do NOT use this hook.
 */
export function useRegisterNativeModal(active: boolean): string {
  const id = useId();

  useEffect(() => {
    const { register, unregister } = useNativeModalStore.getState();
    if (active) {
      register(id);
      return () => unregister(id);
    }
    unregister(id);
    return undefined;
  }, [active, id]);

  return id;
}
