/**
 * Motion tokens — the single source of truth for the app's animation vocabulary.
 * Implement with react-native-reanimated; ALWAYS gate non-essential motion behind a
 * reduced-motion check (see `useMotion`). Personality: warm & lively — gentle, crisp
 * feedback, bounce reserved for celebration. (sw-faces motion is excluded.)
 */
import { Easing } from "react-native-reanimated";

/** Durations (ms). UI motion stays < 300; ambient loops are deliberately separate. */
export const duration = {
  fast: 120, // press, backdrop fade, micro-feedback
  base: 200, // toggles, color/opacity transitions
  reveal: 240, // enters / fade-up reveals
  slow: 300,
  sheetIn: 300, // sheet / drawer enter
  sheetOut: 200, // exit is faster than enter (asymmetry)
  count: 700, // number count-up
  shimmer: 1000, // skeleton pulse cycle
} as const;

/**
 * Easing curves (Reanimated `Easing.bezier`). Strong custom beziers — never the weak
 * built-ins. NEVER use `in` for an enter (it feels sluggish). Use with `withTiming({ easing })`
 * or `.easing()` on a layout-animation builder.
 */
export const easing = {
  out: Easing.bezier(0.23, 1, 0.32, 1), // enters, feedback, reveals (the default)
  inOut: Easing.bezier(0.77, 0, 0.175, 1), // morph / on-screen movement (UI, one-shot)
  in: Easing.bezier(0.32, 0, 0.67, 0), // EXITS only
  loop: Easing.inOut(Easing.ease), // gentle symmetric breathing for ambient/loading LOOPS (shimmer, pulse, float)
  linear: Easing.linear,
} as const;

/**
 * Spring presets — the single source for physics-based motion. Reference these; never
 * hand-write damping/stiffness in a component.
 */
export const spring = {
  press: { mass: 0.4, damping: 14, stiffness: 240 }, // snappy press feedback, no overshoot
  gentle: { mass: 0.7, damping: 20, stiffness: 220 }, // sheets, dock morph, layout — soft settle
  bouncy: { mass: 0.6, damping: 12, stiffness: 200 }, // celebration / reaction pop — small overshoot
} as const;

/** Grouped-entrance stagger. 45ms/item, capped so long lists don't crawl. */
export const stagger = { step: 45, max: 6 } as const;

/** Press-feedback scale (consumed by `PressableScale`). */
export const press = { scale: 0.97 } as const;
