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

/* ── rig geometry — small and high, tucked beside the back-bar row so it can
      never overlap a title/description. One static SVG; only wrapper
      transforms/opacity animate. ── */
const ANCHOR_RIGHT = 52; // lamp centreline, from the right edge
const CORD_LEN = 48;
const SHADE_H = 38;
const SHADE_HALF = 36; // half-width of the shade mouth
const RIM_Y = CORD_LEN + SHADE_H;
const RIG_W = 220;
const RIG_H = RIM_Y + 60; // a little room for the bulb halo
const AXIS = RIG_W / 2;

/**
 * Focus Mode's reading lamp. A small wired lamp drops in from the top-right and
 * the room dims around it via a SPOTLIGHT VIGNETTE — the reading column keeps its
 * full brightness so the text pops (dark ink stays high-contrast on the bright
 * canvas), while the surroundings fall into shadow. A soft edgeless warm field
 * rests over the reading area on top. Turning focus off relights the room quickly
 * (light fades first, then the lamp retracts). Colours are deliberate art literals
 * (a scene, not theme chrome). Non-interactive. Reduced motion: fades only — no
 * drop, no sway.
 */
export const FocusLamp: React.FC<{
  focus: boolean;
}> = ({ focus }) => {
  const reduced = useReducedMotion();

  // 1 = lamp hanging in place, 0 = retracted above the screen.
  const drop = useSharedValue(focus ? 1 : 0);
  // 1 = light on. On after the lamp lands; off BEFORE it retracts (exit faster).
  const lit = useSharedValue(focus ? 1 : 0);
  // Ambient pendulum phase (0..1 mirrored).
  const sway = useSharedValue(0.5);

  useEffect(() => {
    if (focus) {
      drop.value = withTiming(1, {
        duration: reduced ? 260 : 620,
        // A soft settle past the mark, like a cord catching its length.
        easing: reduced ? Easing.out(Easing.cubic) : Easing.out(Easing.back(1.3)),
      });
      lit.value = withDelay(
        reduced ? 0 : 360,
        withTiming(1, { duration: 540, easing: Easing.out(Easing.cubic) }),
      );
    } else {
      // Snappy relight: light off quickly, lamp follows.
      lit.value = withTiming(0, { duration: 260, easing: Easing.out(Easing.cubic) });
      drop.value = withDelay(
        reduced ? 0 : 140,
        withTiming(0, { duration: reduced ? 260 : 420, easing: Easing.out(Easing.cubic) }),
      );
    }
  }, [focus, reduced, drop, lit]);

  useEffect(() => {
    if (reduced) return;
    sway.value = withRepeat(
      withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    return () => cancelAnimation(sway);
  }, [reduced, sway]);

  const rigStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, drop.value * 1.4),
    transform: [
      { translateY: reduced ? 0 : (drop.value - 1) * (RIM_Y + 36) },
      { rotate: reduced ? "0deg" : `${-1.2 + 2.4 * sway.value}deg` },
    ],
  }));
  const lightStyle = useAnimatedStyle(() => ({ opacity: lit.value }));
  // The room recedes so the lamp reads as the light source.
  const dimStyle = useAnimatedStyle(() => ({ opacity: lit.value }));

  return (
    <Animated.View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Room dim — a SPOTLIGHT VIGNETTE, not a flat wash. The reading column keeps
          its full brightness (so dark ink on the bright canvas keeps its contrast and
          the text pops), while the surroundings — top chrome, margins, the dock —
          fall into shadow. This is what makes focus mode calmer to read, not darker. */}
      <Animated.View style={[StyleSheet.absoluteFill, dimStyle]}>
        <Svg width={width} height={height}>
          <Defs>
            <RadialGradient
              id="fl-vignette"
              cx={width / 2}
              cy={height * 0.44}
              r={height * 0.72}
              gradientUnits="userSpaceOnUse"
            >
              <Stop offset="0" stopColor="#000" stopOpacity={0.04} />
              <Stop offset="0.55" stopColor="#000" stopOpacity={0.07} />
              <Stop offset="0.82" stopColor="#000" stopOpacity={0.46} />
              <Stop offset="1" stopColor="#000" stopOpacity={0.82} />
            </RadialGradient>
          </Defs>
          <Rect x={0} y={0} width={width} height={height} fill="url(#fl-vignette)" />
        </Svg>
      </Animated.View>

      {/* The light — ONE edgeless field that pools over the content area, plus a
          faint warmth around the lamp's corner. No geometry, no edges. */}
      <Animated.View style={[StyleSheet.absoluteFill, lightStyle]}>
        <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
          <Defs>
            <RadialGradient id="fl-pool" cx="0.5" cy="0.5" r="0.5">
              <Stop offset="0" stopColor="#FFD9A0" stopOpacity={0.15} />
              <Stop offset="0.45" stopColor="#FFD09A" stopOpacity={0.08} />
              <Stop offset="0.75" stopColor="#FFC98F" stopOpacity={0.03} />
              <Stop offset="1" stopColor="#FFC98F" stopOpacity={0} />
            </RadialGradient>
            <RadialGradient id="fl-corner" cx="0.5" cy="0.5" r="0.5">
              <Stop offset="0" stopColor="#FFCF87" stopOpacity={0.14} />
              <Stop offset="1" stopColor="#FFCF87" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          {/* Reading pool — centred on the content zone, wider than the screen so
              its falloff never shows an edge. */}
          <Ellipse
            cx={width * 0.52}
            cy={height * 0.36}
            rx={width * 0.85}
            ry={height * 0.46}
            fill="url(#fl-pool)"
          />
          {/* Corner warmth around the lamp itself. */}
          <Ellipse
            cx={width - ANCHOR_RIGHT}
            cy={RIM_Y}
            rx={width * 0.5}
            ry={height * 0.28}
            fill="url(#fl-corner)"
          />
        </Svg>
      </Animated.View>

      {/* The lamp — small, high, swinging gently from its ceiling anchor. */}
      <Animated.View style={[styles.rig, rigStyle]}>
        <Svg width={RIG_W} height={RIG_H} viewBox={`0 0 ${RIG_W} ${RIG_H}`}>
          <Defs>
            <SvgLinearGradient id="fl-shade" x1="0.5" y1="0" x2="0.5" y2="1">
              <Stop offset="0" stopColor="#2F6B52" />
              <Stop offset="1" stopColor="#1D4736" />
            </SvgLinearGradient>
            <RadialGradient id="fl-halo" cx="0.5" cy="0.5" r="0.5">
              <Stop offset="0" stopColor="#FFE9B8" stopOpacity={0.6} />
              <Stop offset="0.55" stopColor="#FFE0A6" stopOpacity={0.22} />
              <Stop offset="1" stopColor="#FFE0A6" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          {/* Bulb halo — soft, small, behind the shade mouth. */}
          <Circle cx={AXIS} cy={RIM_Y - 2} r={24} fill="url(#fl-halo)" />
          {/* Ceiling cap + cord. */}
          <Rect x={AXIS - 7} y={0} width={14} height={6} rx={3} fill="#3A362F" />
          <Rect x={AXIS - 1.25} y={4} width={2.5} height={CORD_LEN - 3} rx={1.25} fill="#3A362F" />
          {/* Conical shade (narrow crown → wide mouth). */}
          <Path
            d={`M ${AXIS - 9} ${CORD_LEN}
                L ${AXIS - SHADE_HALF} ${RIM_Y - 5}
                Q ${AXIS} ${RIM_Y + 6} ${AXIS + SHADE_HALF} ${RIM_Y - 5}
                L ${AXIS + 9} ${CORD_LEN} Z`}
            fill="url(#fl-shade)"
          />
          {/* Lit inner rim + bulb peeking out. */}
          <Ellipse cx={AXIS} cy={RIM_Y - 4} rx={SHADE_HALF - 3} ry={7} fill="#F6E9C9" />
          <Circle cx={AXIS} cy={RIM_Y - 2} r={6} fill="#FFE9B8" />
        </Svg>
      </Animated.View>
    </Animated.View>
  );
};

export default FocusLamp;

const styles = StyleSheet.create({
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
