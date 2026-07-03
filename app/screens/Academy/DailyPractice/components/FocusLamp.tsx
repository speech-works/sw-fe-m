import React, { useEffect } from "react";
import { Dimensions, StyleSheet } from "react-native";
import Svg, {
  Circle,
  Defs,
  Ellipse,
  LinearGradient as SvgLinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from "react-native-svg";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

const { width, height } = Dimensions.get("window");

/* ── rig geometry (one static SVG; only wrapper transforms animate) ── */
const ANCHOR_RIGHT = 72; // lamp centreline, from the right edge
const CORD_LEN = 92;
const SHADE_H = 56;
const RIM_Y = CORD_LEN + SHADE_H; // where light leaves the shade
const CONE_H = Math.round(height * 0.62);
const RIG_W = 460; // wide enough to hold the light cone
const RIG_H = RIM_Y + CONE_H;
const AXIS = RIG_W / 2; // lamp centreline inside the viewBox

/**
 * Focus Mode's reading lamp. When focus engages, a wired lamp drops in from the
 * top-right corner, settles with a slow pendulum sway, and spreads a MILD warm
 * cone of light down the page. Disengaging dims the light first, then retracts
 * the lamp — both directions eased (never abrupt), like the Reframe weather.
 * Colours are deliberate art literals (a scene, not theme chrome). Sits behind
 * content, non-interactive. Reduced motion: fades only — no drop, no sway.
 */
export const FocusLamp: React.FC<{ focus: boolean }> = ({ focus }) => {
  const reduced = useReducedMotion();

  // 1 = lamp hanging in place, 0 = retracted above the screen.
  const drop = useSharedValue(focus ? 1 : 0);
  // 1 = light on. Turns on after the lamp lands; turns off before it retracts.
  const lit = useSharedValue(focus ? 1 : 0);
  // Ambient pendulum phase (0..1 mirrored).
  const sway = useSharedValue(0.5);

  useEffect(() => {
    if (focus) {
      drop.value = withTiming(1, {
        duration: reduced ? 300 : 700,
        // Slight settle past the mark, like a cord catching its length.
        easing: reduced ? Easing.out(Easing.cubic) : Easing.out(Easing.back(1.4)),
      });
      lit.value = withDelay(
        reduced ? 0 : 420,
        withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) }),
      );
    } else {
      // Light off first…
      lit.value = withTiming(0, { duration: 320, easing: Easing.in(Easing.cubic) });
      // …then the lamp draws back up.
      drop.value = withDelay(
        reduced ? 0 : 180,
        withTiming(0, { duration: reduced ? 300 : 520, easing: Easing.in(Easing.cubic) }),
      );
    }
  }, [focus, reduced, drop, lit]);

  useEffect(() => {
    if (reduced) return;
    sway.value = withRepeat(
      withTiming(1, { duration: 2800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    return () => cancelAnimation(sway);
  }, [reduced, sway]);

  const rigStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, drop.value * 1.4),
    transform: [
      { translateY: reduced ? 0 : (drop.value - 1) * (RIM_Y + 40) },
      { rotate: reduced ? "0deg" : `${-1.5 + 3 * sway.value}deg` },
    ],
  }));
  const lightStyle = useAnimatedStyle(() => ({ opacity: lit.value }));
  // A faint room-wide warmth so the "mild light" reaches the whole screen.
  const washStyle = useAnimatedStyle(() => ({ opacity: 0.5 * lit.value }));
  // The room dims as the lamp lights — the page recedes so the lamp reads as the
  // light source. Kept mild so text stays comfortably legible.
  const dimStyle = useAnimatedStyle(() => ({ opacity: 0.34 * lit.value }));

  return (
    <Animated.View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Room dim — below the lamp + its light, so the cone "cuts through" it. */}
      <Animated.View style={[styles.dim, dimStyle]} />

      {/* Whole rig (cord + shade + its light) swings together from the cord anchor. */}
      <Animated.View style={[styles.rig, rigStyle]}>
        {/* Light cone + pool — fade with `lit`, under the lamp so the shade caps it. */}
        <Animated.View style={[StyleSheet.absoluteFill, lightStyle]}>
          <Svg width={RIG_W} height={RIG_H} viewBox={`0 0 ${RIG_W} ${RIG_H}`}>
            <Defs>
              <SvgLinearGradient id="fl-cone" x1="0.5" y1="0" x2="0.5" y2="1">
                <Stop offset="0" stopColor="#FFD98C" stopOpacity={0.34} />
                <Stop offset="0.55" stopColor="#FFC66B" stopOpacity={0.12} />
                <Stop offset="1" stopColor="#FFC66B" stopOpacity={0} />
              </SvgLinearGradient>
              <RadialGradient id="fl-halo" cx="0.5" cy="0.5" r="0.5">
                <Stop offset="0" stopColor="#FFE9B8" stopOpacity={0.85} />
                <Stop offset="1" stopColor="#FFE9B8" stopOpacity={0} />
              </RadialGradient>
            </Defs>
            {/* The cone widens from the shade rim down the page. */}
            <Path
              d={`M ${AXIS - 50} ${RIM_Y - 4}
                  L ${AXIS - 205} ${RIM_Y + CONE_H}
                  L ${AXIS + 165} ${RIM_Y + CONE_H}
                  L ${AXIS + 50} ${RIM_Y - 4} Z`}
              fill="url(#fl-cone)"
            />
            {/* Bulb halo just under the rim. */}
            <Circle cx={AXIS} cy={RIM_Y - 4} r={46} fill="url(#fl-halo)" />
          </Svg>
        </Animated.View>

        {/* The lamp itself — cord, green shade, warm rim + bulb. */}
        <Svg width={RIG_W} height={RIG_H} viewBox={`0 0 ${RIG_W} ${RIG_H}`}>
          <Defs>
            <SvgLinearGradient id="fl-shade" x1="0.5" y1="0" x2="0.5" y2="1">
              <Stop offset="0" stopColor="#2F6B52" />
              <Stop offset="1" stopColor="#1D4736" />
            </SvgLinearGradient>
          </Defs>
          {/* Ceiling cap + cord. */}
          <Rect x={AXIS - 9} y={0} width={18} height={7} rx={3.5} fill="#3A362F" />
          <Rect x={AXIS - 1.5} y={5} width={3} height={CORD_LEN - 4} rx={1.5} fill="#3A362F" />
          {/* Conical shade (narrow crown → wide mouth). */}
          <Path
            d={`M ${AXIS - 13} ${CORD_LEN}
                L ${AXIS - 52} ${RIM_Y - 6}
                Q ${AXIS} ${RIM_Y + 8} ${AXIS + 52} ${RIM_Y - 6}
                L ${AXIS + 13} ${CORD_LEN} Z`}
            fill="url(#fl-shade)"
          />
          {/* Lit inner rim + bulb peeking out. */}
          <Ellipse cx={AXIS} cy={RIM_Y - 5} rx={48} ry={9} fill="#F6E9C9" />
          <Circle cx={AXIS} cy={RIM_Y - 2} r={8} fill="#FFE9B8" />
        </Svg>
      </Animated.View>

      {/* Mild room warmth — strongest near the lamp corner, vanishing low-left. */}
      <Animated.View style={[StyleSheet.absoluteFill, washStyle]}>
        <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
          <Defs>
            <RadialGradient id="fl-room" cx="0.82" cy="0.12" r="1">
              <Stop offset="0" stopColor="#FFCF87" stopOpacity={0.16} />
              <Stop offset="0.55" stopColor="#FFCF87" stopOpacity={0.05} />
              <Stop offset="1" stopColor="#FFCF87" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect x={0} y={0} width={width} height={height} fill="url(#fl-room)" />
        </Svg>
      </Animated.View>
    </Animated.View>
  );
};

export default FocusLamp;

const styles = StyleSheet.create({
  dim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
  },
  rig: {
    position: "absolute",
    top: 0,
    right: ANCHOR_RIGHT - RIG_W / 2,
    width: RIG_W,
    height: RIG_H,
    // Pendulum pivot = the ceiling anchor, not the centre.
    transformOrigin: "50% 0%",
  },
});
