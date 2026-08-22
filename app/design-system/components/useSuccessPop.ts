import { useEffect } from "react";
import {
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { duration, spring } from "../motion";

/**
 * Animated style for a "pop": scales 0.6 → 1 while fading in. For genuine success/delight
 * (save, share, reach-out, reminder added) it uses `spring.bouncy` (a small warm overshoot).
 * Pass `{ celebrate: false }` for non-celebratory entrances (e.g. an error disc) so it uses
 * the no-overshoot `spring.gentle` — bounce stays reserved for celebration. Under reduced
 * motion it fades only, no scale. Drive it by flipping `active` true when the moment occurs.
 */
export function useSuccessPop(active: boolean, options?: { celebrate?: boolean }) {
  const celebrate = options?.celebrate ?? true;
  const reduced = useReducedMotion();
  const p = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    if (active) {
      p.value = reduced
        ? withTiming(1, { duration: duration.base })
        : withSpring(1, celebrate ? spring.bouncy : spring.gentle);
    } else {
      p.value = 0;
    }
  }, [active, reduced, celebrate, p]);

  return useAnimatedStyle(() => ({
    opacity: p.value,
    transform: [{ scale: reduced ? 1 : interpolate(p.value, [0, 1], [0.6, 1]) }],
  }));
}

/*
 * THE `SuccessCheck` DISC USED TO LIVE HERE.
 *
 * A success circle with a check glyph that popped in via the hook above.
 * Nothing ever imported it: every screen that wanted the pop reached for
 * `useSuccessPop` and drew its own disc, because each one needed a different
 * size, colour or glyph. The component was the special case nobody had.
 *
 * The hook is the part that earned its place, and it stays. If a plain success
 * disc is ever wanted again, it is nine lines of JSX around this hook, and
 * writing them at the call site is what every caller already chose to do.
 */
