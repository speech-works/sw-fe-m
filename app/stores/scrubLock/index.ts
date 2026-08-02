import { useCallback, useEffect, useId, useMemo } from "react";
import { create } from "zustand";

/**
 * Scroll-steal lock for in-place drag controls (video sliders, and anything else
 * whose gesture axis collides with a scroll container's).
 *
 * A native `<Slider>` inside a horizontal pager loses every drag: RN's ScrollView
 * deliberately cancels touches that started on a child once the pan passes slop
 * (iOS `touchesShouldCancelInContentView` returns YES; Android intercepts before
 * `AbsSeekBar` can call `requestDisallowInterceptTouchEvent`). The control never
 * sees the drag — the page swipes instead.
 *
 * The only reliable fix is for the scroll container to stand down while a finger
 * is on the control, so the control registers here on touch-down and releases on
 * touch-up, and any interested scroll container sets `scrollEnabled={!locked}`.
 * The lock must be taken at touch-DOWN — by the time a slider reports
 * `onSlidingStart` on Android the pager has usually already claimed the gesture.
 */
interface ScrubLockState {
  /** Ids of controls currently under a finger. */
  lockIds: string[];
  lock: (id: string) => void;
  unlock: (id: string) => void;
}

export const useScrubLockStore = create<ScrubLockState>((set) => ({
  lockIds: [],
  lock: (id) =>
    set((state) =>
      state.lockIds.includes(id)
        ? state
        : { lockIds: [...state.lockIds, id] },
    ),
  unlock: (id) =>
    set((state) =>
      state.lockIds.includes(id)
        ? { lockIds: state.lockIds.filter((x) => x !== id) }
        : state,
    ),
}));

/** True while any drag control on screen is held. Scroll containers subscribe. */
export function useIsScrubbing(): boolean {
  return useScrubLockStore((s) => s.lockIds.length > 0);
}

/**
 * Handle for a drag control. Wire `onTouchStart` → `lock`, and both `onTouchEnd`
 * and `onTouchCancel` → `unlock`, on the View wrapping the control: those are
 * bubbling touch events, so they still fire when a *native* child (a Slider)
 * owns the touch. The lock is always released on unmount.
 */
export function useScrubLock() {
  const id = useId();

  useEffect(() => () => useScrubLockStore.getState().unlock(id), [id]);

  const lock = useCallback(() => useScrubLockStore.getState().lock(id), [id]);
  const unlock = useCallback(
    () => useScrubLockStore.getState().unlock(id),
    [id],
  );

  return useMemo(() => ({ lock, unlock }), [lock, unlock]);
}
