import React, { createContext, useContext, useEffect } from "react";
import { View } from "react-native";
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  cancelAnimation,
  Easing,
  withSpring,
} from "react-native-reanimated";
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  Line,
  LinearGradient,
  Mask,
  Path,
  Polygon,
  RadialGradient,
  Rect,
  Stop,
  SvgProps,
} from "react-native-svg";

/* ───────────────────────────────────────────────────────────────────────
   Shared kit for the "Pixar style" sw-faces. Each face component imports
   the primitives + helpers + animated wrappers from here and supplies only
   its own shapes. Animations are gated by `shouldAnimate` via context.
   ─────────────────────────────────────────────────────────────────────── */

// re-export the SVG primitives so face files import everything from one place
export { Circle, Ellipse, G, Line, Path, Polygon, Rect, Mask } from "react-native-svg";

export const AnimatedG = Animated.createAnimatedComponent(G);

export const TILE = "M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24";
export const HEAD =
  "M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736";

export interface SvgIconProps extends SvgProps {
  size?: number | string;
  width?: number | string;
  height?: number | string;
  shouldAnimate?: boolean;
  loop?: boolean;
  repeatCount?: number;
  transparentBg?: boolean;
}

const AnimCtx = createContext(false);
const useAnim = () => useContext(AnimCtx);

const lin = Easing.linear;
const io = Easing.inOut(Easing.ease);
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

/* ── animation hooks (gated by shouldAnimate `sa`) ────────────────────── */
function useBreathe(sa: boolean) {
  const t = useSharedValue(0);
  useEffect(() => {
    if (sa) t.value = withDelay(Math.random() * 1500, withRepeat(withTiming(1, { duration: 1750, easing: io }), -1, true));
    else t.value = 0;
    return () => cancelAnimation(t);
  }, [sa]);
  return useAnimatedProps(() => ({
    transform: [
      { translateY: -t.value * 0.5 },
      { translateX: 24 }, { translateY: 24 },
      { scale: 1 + t.value * 0.015 },
      { translateX: -24 }, { translateY: -24 },
    ] as any,
  }));
}
function useBlink(sa: boolean) {
  const b = useSharedValue(1);
  useEffect(() => {
    if (sa)
      b.value = withDelay(
        Math.random() * 2000 + 500,
        withRepeat(withSequence(withTiming(1, { duration: 3600 }), withTiming(0.1, { duration: 80 }), withTiming(1, { duration: 130 })), -1, false)
      );
    else b.value = 1;
    return () => cancelAnimation(b);
  }, [sa]);
  return useAnimatedProps(() => ({ transform: [{ translateY: 24 }, { scaleY: b.value }, { translateY: -24 }] as any }));
}
function usePan(sa: boolean, dur: number) {
  const v = useSharedValue(0);
  useEffect(() => { if (sa) v.value = withRepeat(withTiming(1, { duration: dur, easing: lin }), -1, false); else v.value = 0; return () => cancelAnimation(v); }, [sa]);
  return useAnimatedProps(() => ({ transform: [{ translateX: -48 * v.value }] as any }));
}
function useWind(sa: boolean, dur: number, delay = 0) {
  const v = useSharedValue(0);
  useEffect(() => { if (sa) v.value = withDelay(delay, withRepeat(withTiming(1, { duration: dur, easing: lin }), -1, false)); else v.value = 0; return () => cancelAnimation(v); }, [sa]);
  return useAnimatedProps(() => ({ transform: [{ translateX: 48 - 96 * v.value }] as any }));
}
function useTwinkleP(sa: boolean, cx: number, cy: number, dur = 3000, delay = 0) {
  const t = useSharedValue(0);
  useEffect(() => { if (sa) t.value = withDelay(delay, withRepeat(withTiming(1, { duration: dur / 2, easing: io }), -1, true)); else t.value = 0; return () => cancelAnimation(t); }, [sa]);
  return useAnimatedProps(() => ({ opacity: 1 - 0.6 * t.value, transform: [{ translateX: cx }, { translateY: cy }, { scale: 1 - 0.4 * t.value }, { translateX: -cx }, { translateY: -cy }] as any }));
}
function useFlickerP(sa: boolean, dur = 2000) {
  const t = useSharedValue(0);
  useEffect(() => { if (sa) t.value = withRepeat(withTiming(1, { duration: dur / 2, easing: io }), -1, true); else t.value = 0; return () => cancelAnimation(t); }, [sa]);
  return useAnimatedProps(() => ({ opacity: 1 - 0.4 * t.value }));
}
function useShimmerP(sa: boolean, dur = 3000) {
  const t = useSharedValue(0);
  useEffect(() => { if (sa) t.value = withRepeat(withTiming(1, { duration: dur / 2, easing: io }), -1, true); else t.value = 0; return () => cancelAnimation(t); }, [sa]);
  return useAnimatedProps(() => ({ opacity: 0.5 + 0.4 * t.value }));
}
function useSpinP(sa: boolean, cx: number, cy: number, dur = 30000) {
  const v = useSharedValue(0);
  useEffect(() => { if (sa) v.value = withRepeat(withTiming(1, { duration: dur, easing: lin }), -1, false); else v.value = 0; return () => cancelAnimation(v); }, [sa]);
  return useAnimatedProps(() => ({ transform: [{ translateX: cx }, { translateY: cy }, { rotate: `${360 * v.value}deg` }, { translateX: -cx }, { translateY: -cy }] as any }));
}
function useSwayP(sa: boolean, cx: number, cy: number, dur = 3000) {
  const t = useSharedValue(0);
  useEffect(() => { if (sa) t.value = withRepeat(withTiming(1, { duration: dur / 2, easing: io }), -1, true); else t.value = 0; return () => cancelAnimation(t); }, [sa]);
  return useAnimatedProps(() => ({ transform: [{ translateX: cx }, { translateY: cy }, { rotate: `${-5 + 10 * t.value}deg` }, { translateX: -cx }, { translateY: -cy }] as any }));
}
function useFlutterP(sa: boolean, cx: number, cy: number, dur = 150) {
  const t = useSharedValue(0);
  useEffect(() => { if (sa) t.value = withRepeat(withTiming(1, { duration: dur, easing: io }), -1, true); else t.value = 0; return () => cancelAnimation(t); }, [sa]);
  return useAnimatedProps(() => ({ transform: [{ translateX: cx }, { translateY: cy }, { rotate: `${-10 * t.value}deg` }, { translateX: -cx }, { translateY: -cy }] as any }));
}
function useTrekP(sa: boolean, dur = 3000) {
  const t = useSharedValue(0);
  useEffect(() => { if (sa) t.value = withRepeat(withTiming(1, { duration: dur, easing: io }), -1, true); else t.value = 0; return () => cancelAnimation(t); }, [sa]);
  return useAnimatedProps(() => ({ transform: [{ translateX: -2 + 4 * t.value }, { translateY: 2 - 4 * t.value }, { scale: 0.9 + 0.2 * t.value }] as any }));
}

/* ── animated wrappers (read shouldAnimate from context) ──────────────── */
type K = { children: React.ReactNode };
export const Head: React.FC<K> = ({ children }) => <AnimatedG animatedProps={useBreathe(useAnim())}>{children}</AnimatedG>;
export const Blink: React.FC<K> = ({ children }) => <AnimatedG animatedProps={useBlink(useAnim())}>{children}</AnimatedG>;
export const Pan: React.FC<K & { dur: number }> = ({ dur, children }) => <AnimatedG animatedProps={usePan(useAnim(), dur)}>{children}</AnimatedG>;
export const Wind: React.FC<K & { dur: number; delay?: number }> = ({ dur, delay, children }) => <AnimatedG animatedProps={useWind(useAnim(), dur, delay)}>{children}</AnimatedG>;
export const Twinkle: React.FC<K & { cx: number; cy: number; dur?: number; delay?: number }> = ({ cx, cy, dur, delay, children }) => <AnimatedG animatedProps={useTwinkleP(useAnim(), cx, cy, dur, delay)}>{children}</AnimatedG>;
export const Flicker: React.FC<K> = ({ children }) => <AnimatedG animatedProps={useFlickerP(useAnim())}>{children}</AnimatedG>;
export const Shimmer: React.FC<K & { dur?: number }> = ({ dur, children }) => <AnimatedG animatedProps={useShimmerP(useAnim(), dur)}>{children}</AnimatedG>;
export const Spin: React.FC<K & { cx: number; cy: number; dur?: number }> = ({ cx, cy, dur, children }) => <AnimatedG animatedProps={useSpinP(useAnim(), cx, cy, dur)}>{children}</AnimatedG>;
export const Sway: React.FC<K & { cx: number; cy: number }> = ({ cx, cy, children }) => <AnimatedG animatedProps={useSwayP(useAnim(), cx, cy)}>{children}</AnimatedG>;
export const Flutter: React.FC<K & { cx: number; cy: number }> = ({ cx, cy, children }) => <AnimatedG animatedProps={useFlutterP(useAnim(), cx, cy)}>{children}</AnimatedG>;
export const Trek: React.FC<K> = ({ children }) => <AnimatedG animatedProps={useTrekP(useAnim())}>{children}</AnimatedG>;

/* ── signature-gesture primitives ─────────────────────────────────────── */
// continuous oscillation 0↔1
function useOsc(sa: boolean, dur: number) {
  const t = useSharedValue(0);
  useEffect(() => { if (sa) t.value = withRepeat(withTiming(1, { duration: dur, easing: io }), -1, true); else t.value = 0; return () => cancelAnimation(t); }, [sa]);
  return t;
}
// linear 0→1 loop (for phase math)
function useLoop(sa: boolean, dur: number) {
  const v = useSharedValue(0);
  useEffect(() => { if (sa) v.value = withRepeat(withTiming(1, { duration: dur, easing: lin }), -1, false); else v.value = 0; return () => cancelAnimation(v); }, [sa]);
  return v;
}
// "gesture beat": rests at 0, briefly rises to 1, falls back — once per cycle
function useBeatSV(sa: boolean, rest: number, up: number, down: number) {
  const g = useSharedValue(0);
  useEffect(() => {
    if (sa) g.value = withDelay(Math.random() * 1500, withRepeat(withSequence(withDelay(rest, withTiming(1, { duration: up, easing: EASE_OUT })), withTiming(0, { duration: down, easing: io })), -1, false));
    else g.value = 0;
    return () => cancelAnimation(g);
  }, [sa]);
  return g;
}

export const Buzz: React.FC<any> = ({ px, py, dur = 120, children }) => {
  const t = useOsc(useAnim(), dur);
  const p = useAnimatedProps(() => ({ transform: [{ translateX: px }, { translateY: py }, { scaleX: 1 - 0.5 * t.value }, { translateX: -px }, { translateY: -py }] as any }));
  return <AnimatedG animatedProps={p}>{children}</AnimatedG>;
};
export const Hover: React.FC<any> = ({ dur = 2200, children }) => {
  const v = useLoop(useAnim(), dur);
  const p = useAnimatedProps(() => ({ transform: [{ translateX: Math.sin(v.value * Math.PI * 2) * 0.6 }, { translateY: -Math.abs(Math.sin(v.value * Math.PI)) * 1.6 }] as any }));
  return <AnimatedG animatedProps={p}>{children}</AnimatedG>;
};
export const Scan: React.FC<any> = ({ amp = 3, dur = 2400, children }) => {
  const t = useOsc(useAnim(), dur);
  const p = useAnimatedProps(() => ({ transform: [{ translateX: amp * (2 * t.value - 1) }] as any }));
  return <AnimatedG animatedProps={p}>{children}</AnimatedG>;
};
export const Float: React.FC<any> = ({ dur = 4000, children }) => {
  const t = useOsc(useAnim(), dur);
  const p = useAnimatedProps(() => ({ opacity: 1 - 0.18 * t.value, transform: [{ translateY: -2.2 * t.value }] as any }));
  return <AnimatedG animatedProps={p}>{children}</AnimatedG>;
};
export const Glow: React.FC<any> = ({ cx, cy, from = 0.45, to = 0.95, sc0 = 0.95, sc1 = 1.1, dur = 2600, children }) => {
  const t = useOsc(useAnim(), dur);
  const p = useAnimatedProps(() => ({ opacity: from + (to - from) * t.value, transform: [{ translateX: cx }, { translateY: cy }, { scale: sc0 + (sc1 - sc0) * t.value }, { translateX: -cx }, { translateY: -cy }] as any }));
  return <AnimatedG animatedProps={p}>{children}</AnimatedG>;
};
export const Glitch: React.FC<any> = ({ children }) => {
  const g = useBeatSV(useAnim(), 3000, 60, 120);
  const p = useAnimatedProps(() => ({ opacity: 1 - 0.4 * g.value, transform: [{ translateX: 0.8 * g.value }] as any }));
  return <AnimatedG animatedProps={p}>{children}</AnimatedG>;
};
export const OscRotate: React.FC<any> = ({ deg, cx, cy, dur = 3000, children }) => {
  const t = useOsc(useAnim(), dur);
  const p = useAnimatedProps(() => ({ transform: [{ translateX: cx }, { translateY: cy }, { rotate: `${-deg + 2 * deg * t.value}deg` }, { translateX: -cx }, { translateY: -cy }] as any }));
  return <AnimatedG animatedProps={p}>{children}</AnimatedG>;
};
export const OscScaleY: React.FC<any> = ({ cy, from = 1, to = 0.85, dur = 500, children }) => {
  const t = useOsc(useAnim(), dur);
  const p = useAnimatedProps(() => ({ transform: [{ translateY: cy }, { scaleY: from + (to - from) * t.value }, { translateY: -cy }] as any }));
  return <AnimatedG animatedProps={p}>{children}</AnimatedG>;
};
export const BeatRotate: React.FC<any> = ({ deg, cx, cy, rest = 4000, up = 180, down = 340, children }) => {
  const g = useBeatSV(useAnim(), rest, up, down);
  const p = useAnimatedProps(() => ({ transform: [{ translateX: cx }, { translateY: cy }, { rotate: `${deg * g.value}deg` }, { translateX: -cx }, { translateY: -cy }] as any }));
  return <AnimatedG animatedProps={p}>{children}</AnimatedG>;
};
export const BeatScale: React.FC<any> = ({ to, cx, cy, rest = 4000, up = 180, down = 340, children }) => {
  const g = useBeatSV(useAnim(), rest, up, down);
  const p = useAnimatedProps(() => ({ transform: [{ translateX: cx }, { translateY: cy }, { scale: 1 + (to - 1) * g.value }, { translateX: -cx }, { translateY: -cy }] as any }));
  return <AnimatedG animatedProps={p}>{children}</AnimatedG>;
};
export const BeatScaleY: React.FC<any> = ({ to, cy, rest = 4000, up = 140, down = 260, children }) => {
  const g = useBeatSV(useAnim(), rest, up, down);
  const p = useAnimatedProps(() => ({ transform: [{ translateY: cy }, { scaleY: 1 + (to - 1) * g.value }, { translateY: -cy }] as any }));
  return <AnimatedG animatedProps={p}>{children}</AnimatedG>;
};
export const BeatTranslate: React.FC<any> = ({ dx = 0, dy = 0, rest = 4000, up = 200, down = 400, children }) => {
  const g = useBeatSV(useAnim(), rest, up, down);
  const p = useAnimatedProps(() => ({ transform: [{ translateX: dx * g.value }, { translateY: dy * g.value }] as any }));
  return <AnimatedG animatedProps={p}>{children}</AnimatedG>;
};

/* ── complex genuine animations ─────────────────────────────────────── */

function useFoldSV(sa: boolean) {
  const g = useSharedValue(0);
  useEffect(() => {
    if (sa) g.value = withDelay(Math.random() * 500, withRepeat(withSequence(withDelay(1200, withTiming(1, { duration: 150, easing: Easing.out(Easing.quad) })), withDelay(1500, withTiming(0, { duration: 300, easing: io }))), -1, false));
    else g.value = 0;
    return () => cancelAnimation(g);
  }, [sa]);
  return g;
}

export const FoldFingers: React.FC<any> = ({ cx, cy, children }) => {
  const sa = useAnim();
  const g = useFoldSV(sa);
  const p = useAnimatedProps(() => ({
    transform: [{ translateX: cx }, { translateY: cy }, { scaleY: 1 - 2 * g.value }, { translateX: -cx }, { translateY: -cy }] as any
  }));
  return <AnimatedG animatedProps={p}>{children}</AnimatedG>;
};

export const FoldThumb: React.FC<any> = ({ cx, cy, children }) => {
  const sa = useAnim();
  const g = useFoldSV(sa);
  const p = useAnimatedProps(() => ({
    transform: [{ translateX: cx }, { translateY: cy }, { scaleX: 1 - 2 * g.value }, { rotate: `${25 * g.value}deg` }, { translateX: -cx }, { translateY: -cy }] as any
  }));
  return <AnimatedG animatedProps={p}>{children}</AnimatedG>;
};

export const PowerPunch: React.FC<any> = ({ children }) => {
  const sa = useAnim();
  const g = useSharedValue(0);
  useEffect(() => {
    if (sa) g.value = withDelay(Math.random() * 500, withRepeat(withSequence(
      withTiming(0, { duration: 1500 }),
      withTiming(-0.2, { duration: 300, easing: Easing.in(Easing.quad) }),
      withTiming(1, { duration: 150, easing: Easing.out(Easing.back(1.5)) }),
      withTiming(1, { duration: 800 }),
      withTiming(0, { duration: 600, easing: io })
    ), -1, false));
    else g.value = 0;
    return () => cancelAnimation(g);
  }, [sa]);
  const p = useAnimatedProps(() => ({
    transform: [{ translateY: 10 - 15 * g.value }] as any
  }));
  return <AnimatedG animatedProps={p}>{children}</AnimatedG>;
};

export const RepLift: React.FC<any> = ({ children }) => {
  const sa = useAnim();
  const g = useSharedValue(0);
  useEffect(() => {
    if (sa) g.value = withDelay(Math.random() * 500, withRepeat(withSequence(
      withTiming(0, { duration: 1000 }),
      withTiming(1, { duration: 800, easing: Easing.out(Easing.cubic) }),
      withTiming(1, { duration: 400 }),
      withTiming(0, { duration: 600, easing: io })
    ), -1, false));
    else g.value = 0;
    return () => cancelAnimation(g);
  }, [sa]);
  const p = useAnimatedProps(() => ({
    transform: [{ translateY: 10 - 20 * g.value }] as any
  }));
  return <AnimatedG animatedProps={p}>{children}</AnimatedG>;
};

export const Heartbeat: React.FC<any> = ({ cx, cy, children }) => {
  const sa = useAnim();
  const g = useSharedValue(0);
  useEffect(() => {
    if (sa) g.value = withDelay(Math.random() * 500, withRepeat(withSequence(
      withTiming(0, { duration: 800 }),
      // Lub (small, fast)
      withTiming(0.4, { duration: 80, easing: Easing.out(Easing.cubic) }),
      withTiming(0, { duration: 120, easing: Easing.in(Easing.cubic) }),
      // Dub (large, fast expansion)
      withTiming(1, { duration: 120, easing: Easing.out(Easing.cubic) }),
      // Elastic recoil back to rest
      withTiming(0, { duration: 400, easing: Easing.out(Easing.back(1.5)) })
    ), -1, false));
    else g.value = 0;
    return () => cancelAnimation(g);
  }, [sa]);
  const p = useAnimatedProps(() => ({
    transform: [{ translateX: cx }, { translateY: cy }, { scale: 1 + 0.3 * g.value }, { translateX: -cx }, { translateY: -cy }] as any
  }));
  return <AnimatedG animatedProps={p}>{children}</AnimatedG>;
};

export const ZoomSpring: React.FC<any> = ({ cx, cy, children }) => {
  const sa = useAnim();
  const g = useSharedValue(0);
  useEffect(() => {
    if (sa) g.value = withDelay(Math.random() * 500, withRepeat(withSequence(
      withTiming(0, { duration: 1500 }),
      withSpring(1, { damping: 6, stiffness: 120 }),
      withDelay(2000, withTiming(0, { duration: 400 }))
    ), -1, false));
    else g.value = 1;
    return () => cancelAnimation(g);
  }, [sa]);
  const p = useAnimatedProps(() => ({
    transform: [{ translateX: cx }, { translateY: cy }, { scale: g.value }, { translateX: -cx }, { translateY: -cy }] as any
  }));
  return <AnimatedG animatedProps={p}>{children}</AnimatedG>;
};

export const ConfettiBlast: React.FC<any> = ({ tx, ty, rot, delay = 0, children }) => {
  const sa = useAnim();
  const g = useSharedValue(0);
  useEffect(() => {
    if (sa) g.value = withDelay(delay, withRepeat(withSequence(
      withTiming(0, { duration: 1500 }),
      withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) }),
      withTiming(1, { duration: 1000 })
    ), -1, false));
    else g.value = 1;
    return () => cancelAnimation(g);
  }, [sa, delay]);
  const p = useAnimatedProps(() => ({
    opacity: g.value < 0.1 ? 0 : (g.value > 0.8 ? 1 - (g.value - 0.8) * 5 : 1),
    transform: [{ translateX: tx * g.value }, { translateY: ty * g.value }, { rotate: `${rot * g.value}deg` }, { scale: g.value < 0.2 ? 5 * g.value : 1 }] as any
  }));
  return <AnimatedG animatedProps={p}>{children}</AnimatedG>;
};

export const ShineSweep: React.FC<any> = ({ children }) => {
  const sa = useAnim();
  const g = useSharedValue(0);
  useEffect(() => {
    if (sa) g.value = withDelay(Math.random() * 1000, withRepeat(withSequence(
      withTiming(0, { duration: 2500 }),
      withTiming(1, { duration: 500, easing: lin })
    ), -1, false));
    else g.value = 0;
    return () => cancelAnimation(g);
  }, [sa]);
  const p = useAnimatedProps(() => ({
    transform: [{ translateX: -48 + 96 * g.value }] as any
  }));
  return <AnimatedG animatedProps={p}>{children}</AnimatedG>;
};

export const PopLid: React.FC<any> = ({ children }) => {
  const sa = useAnim();
  const g = useSharedValue(0);
  useEffect(() => {
    if (sa) g.value = withDelay(Math.random() * 500, withRepeat(withSequence(
      withTiming(0, { duration: 1200 }),
      withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) }),
      withTiming(1, { duration: 1000 }),
      withTiming(0, { duration: 400, easing: Easing.in(Easing.cubic) })
    ), -1, false));
    else g.value = 0;
    return () => cancelAnimation(g);
  }, [sa]);
  const p = useAnimatedProps(() => ({
    transform: [{ translateX: 24 }, { translateY: 20 }, { translateY: -20 * g.value }, { rotate: `${15 * g.value}deg` }, { translateX: -24 }, { translateY: -20 }] as any
  }));
  return <AnimatedG animatedProps={p}>{children}</AnimatedG>;
};

/* ── realistic custom animations ─────────────────────────────────────── */

function useFlameSV(sa: boolean) {
  const t = useSharedValue(0);
  useEffect(() => {
    if (sa) {
      t.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 150, easing: io }),
          withTiming(0.4, { duration: 100, easing: io }),
          withTiming(0.8, { duration: 180, easing: io }),
          withTiming(0, { duration: 250, easing: io })
        ),
        -1,
        false
      );
    } else t.value = 0;
    return () => cancelAnimation(t);
  }, [sa]);
  return useAnimatedProps(() => ({
    opacity: 0.8 + 0.2 * t.value,
    transform: [
      { translateY: 12 }, 
      { scaleY: 1 + 0.1 * t.value },
      { scaleX: 1 - 0.05 * t.value },
      { skewX: `${-2 + 4 * t.value}deg` },
      { translateY: -12 }
    ] as any
  }));
}
export const FlameDance: React.FC<K> = ({ children }) => <AnimatedG animatedProps={useFlameSV(useAnim())}>{children}</AnimatedG>;

function useClinkSV(sa: boolean, isRight: boolean) {
  const t = useSharedValue(0);
  useEffect(() => {
    if (sa) {
      t.value = withDelay(500, withRepeat(
        withSequence(
          withTiming(0, { duration: 2000 }),
          withTiming(-0.3, { duration: 600, easing: Easing.inOut(Easing.quad) }),
          withTiming(1, { duration: 200, easing: Easing.out(Easing.cubic) }),
          withTiming(0, { duration: 500, easing: Easing.out(Easing.back(1.5)) })
        ),
        -1,
        false
      ));
    } else t.value = 0;
    return () => cancelAnimation(t);
  }, [sa]);
  const dir = isRight ? -1 : 1;
  return useAnimatedProps(() => ({
    transform: [
      { rotate: `${dir * 10 * t.value}deg` },
      { translateX: dir * 6 * t.value },
      { translateY: -2 * t.value }
    ] as any
  }));
}
export const MugClinkLeft: React.FC<K> = ({ children }) => <AnimatedG animatedProps={useClinkSV(useAnim(), false)}>{children}</AnimatedG>;
export const MugClinkRight: React.FC<K> = ({ children }) => <AnimatedG animatedProps={useClinkSV(useAnim(), true)}>{children}</AnimatedG>;

function useCorkPopSV(sa: boolean) {
  const pop = useSharedValue(0);
  const shake = useSharedValue(0);
  useEffect(() => {
    if (sa) {
      pop.value = withRepeat(
        withSequence(
          withTiming(0, { duration: 1250 }),
          withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) }),
          withTiming(1, { duration: 950 }),
          withTiming(0, { duration: 0 })
        ), -1, false);
        
      shake.value = withRepeat(
        withSequence(
          withTiming(0, { duration: 1050 }),
          withTiming(1, { duration: 50 }),
          withTiming(-1, { duration: 50 }),
          withTiming(1, { duration: 50 }),
          withTiming(0, { duration: 50 }),
          withTiming(0, { duration: 1250 })
        ), -1, false);
    } else {
      pop.value = 0;
      shake.value = 0;
    }
    return () => { cancelAnimation(pop); cancelAnimation(shake); };
  }, [sa]);
  
  return useAnimatedProps(() => {
    const p = pop.value;
    const s = shake.value * (1 - p);
    return {
      opacity: p > 0.6 ? 1 - (p - 0.6) * 2.5 : 1,
      transform: [
        { translateX: 1.5 * s },
        { translateY: -70 * p },
        { rotate: `${180 * p + 5 * s}deg` }
      ] as any
    };
  });
}
export const CorkPop: React.FC<K> = ({ children }) => <AnimatedG animatedProps={useCorkPopSV(useAnim())}>{children}</AnimatedG>;

export const SprayShoot: React.FC<K & { tx: number; ty: number; delay?: number }> = ({ tx, ty, delay = 0, children }) => {
  const sa = useAnim();
  const g = useSharedValue(0);
  useEffect(() => {
    if (sa) {
      g.value = withRepeat(
        withSequence(
          withTiming(0, { duration: 1250 + delay }),
          withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) }),
          withTiming(1, { duration: 850 - delay }),
          withTiming(0, { duration: 0 })
        ), -1, false);
    } else g.value = 0;
    return () => cancelAnimation(g);
  }, [sa, delay]);
  
  const p = useAnimatedProps(() => ({
    opacity: g.value === 0 ? 0 : (g.value > 0.6 ? 1 - (g.value - 0.6) * 2.5 : 1),
    transform: [
      { translateX: tx * g.value },
      { translateY: ty * g.value },
      { scale: 0.5 + 1.5 * g.value }
    ] as any
  }));
  return <AnimatedG animatedProps={p}>{children}</AnimatedG>;
};

export const TreeGrow: React.FC<K & { originY: number; delay?: number }> = ({ originY, delay = 0, children }) => {
  const sa = useAnim();
  const g = useSharedValue(0);
  useEffect(() => {
    if (sa) {
      g.value = withDelay(delay, withRepeat(
        withSequence(
          withTiming(0, { duration: 500 }),
          withTiming(1, { duration: 1200, easing: Easing.out(Easing.back(1.5)) }),
          withTiming(1, { duration: 3000 }),
          withTiming(0, { duration: 0 })
        ), -1, false));
    } else g.value = 0;
    return () => cancelAnimation(g);
  }, [sa, delay]);
  
  const p = useAnimatedProps(() => ({
    opacity: 1,
    transform: [
      { translateY: originY },
      { scaleY: 0.8 + 0.6 * g.value },
      { translateY: -originY }
    ] as any
  }));
  return <AnimatedG animatedProps={p}>{children}</AnimatedG>;
};

import { interpolateColor } from "react-native-reanimated";

export const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export const DayNightCycle: React.FC<K> = ({ children }) => {
  const sa = useAnim();
  const t = useSharedValue(0.5); // Default to day
  useEffect(() => {
    if (sa) {
      t.value = 0; // Start at sunrise
      t.value = withRepeat(
        withSequence(
          withTiming(0.5, { duration: 6000, easing: Easing.out(Easing.sin) }), // Rise to Noon
          withTiming(0.5, { duration: 4000 }), // Hold at Noon
          withTiming(1, { duration: 6000, easing: Easing.in(Easing.sin) }), // Set to Sunset
          withTiming(2, { duration: 4000, easing: Easing.linear }) // Night traveling underground
        ), -1, false);
    } else t.value = 0.5;
    return () => cancelAnimation(t);
  }, [sa]);
  
  const skyProps = useAnimatedProps(() => ({
    fill: interpolateColor(
      t.value,
      [0, 0.2, 0.5, 0.8, 1, 2],
      ["#1A237E", "#FF8A65", "#4FC3F7", "#FF8A65", "#1A237E", "#1A237E"]
    )
  }));

  const sunProps = useAnimatedProps(() => {
    const angle = t.value * Math.PI;
    return {
      fill: interpolateColor(
        t.value,
        [0, 0.2, 0.5, 0.8, 1, 2],
        ["#E64A19", "#FF9800", "#FFF59D", "#FF9800", "#E64A19", "#E64A19"]
      ),
      opacity: t.value > 1 ? 0 : 0.6 + 0.4 * Math.sin(angle),
      transform: [
        { translateX: -15 * Math.cos(angle) },
        { translateY: 10 - 25 * Math.sin(angle) }
      ] as any
    };
  });

  const sunGlowProps = useAnimatedProps(() => {
    const angle = t.value * Math.PI;
    return {
      fill: interpolateColor(
        t.value,
        [0, 0.2, 0.5, 0.8, 1, 2],
        ["#E64A19", "#FF9800", "#FFF59D", "#FF9800", "#E64A19", "#E64A19"]
      ),
      opacity: t.value > 1 ? 0 : (0.6 + 0.4 * Math.sin(angle)) * 0.4,
      transform: [
        { translateX: -15 * Math.cos(angle) },
        { translateY: 10 - 25 * Math.sin(angle) }
      ] as any
    };
  });

  return (
    <>
      <AnimatedCircle cx={24} cy={24} r={24} animatedProps={skyProps as any} />
      <G transform="translate(24, 28)">
        <AnimatedCircle cx={0} cy={0} r={10} animatedProps={sunProps as any} />
        <AnimatedCircle cx={0} cy={0} r={18} animatedProps={sunGlowProps as any} />
      </G>
      {children}
    </>
  );
};



/* ── shared defs + building blocks ────────────────────────────────────── */
export const FaceDefs = () => (
  <Defs>
    <LinearGradient id="volume" x1="0%" y1="0%" x2="100%" y2="100%">
      <Stop offset="0%" stopColor="#FFF" stopOpacity="0.25" />
      <Stop offset="40%" stopColor="#FFF" stopOpacity="0" />
      <Stop offset="60%" stopColor="#000" stopOpacity="0" />
      <Stop offset="100%" stopColor="#000" stopOpacity="0.2" />
    </LinearGradient>
    <RadialGradient id="sphere" cx="35%" cy="35%" r="65%">
      <Stop offset="0%" stopColor="#FFF" stopOpacity="0.6" />
      <Stop offset="25%" stopColor="#FFF" stopOpacity="0.1" />
      <Stop offset="100%" stopColor="#000" stopOpacity="0.25" />
    </RadialGradient>
    <Mask id="circ" maskUnits="userSpaceOnUse" x="0" y="0" width="48" height="48"><Path fill="#fff" d={TILE} /></Mask>
    <Mask id="head" maskUnits="userSpaceOnUse" x="0" y="0" width="48" height="48"><Path fill="#fff" d={HEAD} /></Mask>
    <LinearGradient id="dawn" x1="0%" y1="0%" x2="0%" y2="100%">
      <Stop offset="0%" stopColor="#006064" /><Stop offset="60%" stopColor="#4DB6AC" /><Stop offset="100%" stopColor="#FFAB91" />
    </LinearGradient>
    <LinearGradient id="sunrise" x1="0%" y1="100%" x2="0%" y2="0%">
      <Stop offset="0%" stopColor="#FFC107" /><Stop offset="50%" stopColor="#FF9800" /><Stop offset="100%" stopColor="#E65100" />
    </LinearGradient>
    <LinearGradient id="dusk" x1="0%" y1="0%" x2="0%" y2="100%">
      <Stop offset="0%" stopColor="#1A237E" /><Stop offset="100%" stopColor="#311B92" />
    </LinearGradient>
  </Defs>
);

export const Plate: React.FC<{ c: string }> = ({ c }) => (
  <>
    <Path fill="#000" opacity="0.1" transform="translate(0 4)" d={HEAD} />
    <Path fill="#000" opacity="0.08" transform="translate(0 2)" d={HEAD} />
    <Path fill={c} d={HEAD} />
    <Path fill="url(#volume)" d={HEAD} />
  </>
);
export const Eye: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <>
    <Circle cx={x} cy={y} r="3" fill="#191A1F" />
    <Circle cx={x - 1} cy={y - 1} r="1" fill="#fff" />
    <Circle cx={x + 1.2} cy={y + 1.2} r="0.4" fill="#fff" opacity="0.7" />
  </>
);

/* The shell every face uses: View + Svg + defs + circle-clipped bg.
   Provides `shouldAnimate` to the animated wrappers via context. */
export const FaceShell: React.FC<SvgIconProps & { bg: string; children: React.ReactNode }> = ({
  size = 48,
  width,
  height,
  transparentBg = false,
  shouldAnimate = false,
  bg,
  children,
  ...rest
}) => {
  const w = width || size;
  const h = height || size;
  return (
    <AnimCtx.Provider value={!!shouldAnimate}>
      <View style={{ width: w as any, height: h as any, borderRadius: (Number(w) || 48) / 2, overflow: "hidden" }}>
        <Svg width={w} height={h} viewBox="0 0 48 48" fill="none" {...rest}>
          <FaceDefs />
          <G mask="url(#circ)">
            {!transparentBg && <Path fill={bg} d={TILE} />}
            {children}
          </G>
        </Svg>
      </View>
    </AnimCtx.Provider>
  );
};
