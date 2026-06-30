/**
 * Reduced-motion gate + ready-made entrance/layout presets, built on the `motion`
 * tokens. Emil's rule: reduced motion = keep opacity, drop transform/position — gentler,
 * not zero. Use these so EVERY animation degrades the same way.
 */
import {
  FadeIn,
  FadeInDown,
  LinearTransition,
  useReducedMotion,
} from "react-native-reanimated";
import { duration, easing, spring, stagger } from "./motion";

/** A staggered, reduced-motion-aware entrance for list/section reveals. Returns the
 *  `entering` prop for an `Animated.View`. Delay is capped at `stagger.max` items. */
export function staggerEntering(index: number, reduced: boolean) {
  if (reduced) return FadeIn.duration(duration.base);
  const delay = Math.min(index, stagger.max) * stagger.step;
  return FadeInDown.duration(duration.reveal).easing(easing.out).delay(delay);
}

/** Opacity-only staggered entrance (no transform) — for reveals whose geometry must
 *  NOT shift mid-animation, e.g. a connected timeline rail where a translate would
 *  momentarily break the thread. The list "draws in" top-to-bottom. */
export function fadeStaggerEntering(index: number, reduced: boolean) {
  if (reduced) return FadeIn.duration(duration.base);
  const delay = Math.min(index, stagger.max) * stagger.step;
  return FadeIn.duration(duration.reveal).delay(delay);
}

/** A single enter preset (no stagger): fade-up, or fade-only when reduced. */
export function enterPreset(reduced: boolean) {
  if (reduced) return FadeIn.duration(duration.base);
  return FadeInDown.duration(duration.reveal).easing(easing.out);
}

/** Layout-animation preset for list reorder / resize. `undefined` => no motion. */
export function layoutPreset(reduced: boolean) {
  if (reduced) return undefined;
  return LinearTransition.springify()
    .damping(spring.gentle.damping)
    .stiffness(spring.gentle.stiffness)
    .mass(spring.gentle.mass);
}

/** Convenience hook bundling the reduced-motion flag with the standard presets. */
export function useMotion() {
  const reduced = useReducedMotion();
  return {
    reduced,
    /** entering prop for item at `index` in a staggered group */
    stagger: (index: number) => staggerEntering(index, reduced),
    /** entering prop for a single element */
    enter: () => enterPreset(reduced),
    /** layout prop for a reordering/resizing container */
    layout: () => layoutPreset(reduced),
  };
}
