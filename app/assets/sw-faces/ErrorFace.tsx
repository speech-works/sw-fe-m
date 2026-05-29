import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, G, Path, SvgProps } from "react-native-svg";

// Created once at module level
const AnimatedG = Animated.createAnimatedComponent(G);

interface SvgIconProps extends SvgProps {
  shouldAnimate?: boolean;
  size?: number | string;
  width?: number | string;
  height?: number | string;
  transparentBg?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
//  PERFORMANCE ARCHITECTURE
//
//  The previous version wrapped the SVG face in AnimatedG, causing the ENTIRE
//  SVG (skin path + circles + mouth) to re-render every animation frame.
//  This was the source of scroll/tab jank.
//
//  New approach — three tiers of cost:
//
//  Tier 1 (zero cost): Static native View — gray background circle.
//                      Never touches JS or SVG during animation.
//
//  Tier 2 (compositor): Animated.View wrapping the face SVG for the PEEK slide.
//                       translateY is driven by the native driver — runs entirely
//                       on the compositor thread. Zero JS, zero SVG re-render.
//
//  Tier 3 (minimal): AnimatedG wrapping only 2 Circle elements for the eye
//                    look-around. Only 2 tiny SVG primitives re-rendered,
//                    only for 1200ms per 5.6-second cycle.
//
//  Mouth: STATIC — no animation, no overhead.
//
//  Result: during scroll/tabs, the animation never touches the JS thread.
// ─────────────────────────────────────────────────────────────────────────────

// Timing (ms)
const T_PEEK = 700; // face rises to eye level
const T_LOOK = 1200; // eye look-around
const T_REVEAL = 700; // slow, deliberate full reveal (user asked for slower)
const T_HOLD = 2000; // fully visible, still
const T_RETREAT = 500; // retreat below
const T_REST = 500; // hidden rest before loop

const O_LOOK = T_PEEK;
const O_REVEAL = O_LOOK + T_LOOK;
const TOTAL = T_PEEK + T_LOOK + T_REVEAL + T_HOLD + T_RETREAT + T_REST;

const ErrorFace = ({
  size = 48,
  width,
  height,
  shouldAnimate = false,
  transparentBg = false,
  ...props
}: SvgIconProps) => {
  const activeWidth = width || size;
  const activeHeight = height || size;
  const numH = Number(activeHeight) || 48;

  // Fractional position (in viewbox 0→48) up to which the face is visible at peek stop.
  // y=22 = eye center · y=28 = slightly below eyes — shows eyes + a band beneath.
  const EYE_Y_FRAC = 28 / 48;

  // peekY is in PIXELS — drives Animated.View (native compositor)
  // Start fully hidden below the clip boundary, peek to eye level, then full reveal
  const peekStopY = numH * (1 - EYE_Y_FRAC); // ≈54px for 130px face
  const peekY = useSharedValue(numH);

  // eyeX is in SVG units — drives AnimatedG (only 2 small circles)
  const eyeX = useSharedValue(0);

  useEffect(() => {
    if (!shouldAnimate) {
      cancelAnimation(peekY);
      cancelAnimation(eyeX);
      peekY.value = withTiming(numH, { duration: 350 });
      eyeX.value = withTiming(0, { duration: 150 });
      return;
    }

    peekY.value = numH;
    eyeX.value = 0;

    // ── Peek slide (Animated.View — compositor thread) ─────────────────────
    peekY.value = withRepeat(
      withSequence(
        withTiming(peekStopY, {
          // peek to eye level
          duration: T_PEEK,
          easing: Easing.out(Easing.ease),
        }),
        withTiming(peekStopY, { duration: T_LOOK }), // hold at eye level (eyes move)
        withTiming(0, {
          // slow full reveal
          duration: T_REVEAL,
          easing: Easing.out(Easing.back(1.3)),
        }),
        withTiming(0, { duration: T_HOLD }), // hold fully visible
        withTiming(numH, {
          // retreat
          duration: T_RETREAT,
          easing: Easing.in(Easing.ease),
        }),
        withTiming(numH, { duration: T_REST }), // rest hidden
      ),
      -1,
      false,
    );

    // ── Eye look-around (AnimatedG — only 2 SVG circles) ──────────────────
    // Silent during all phases except the look phase (T_LOOK window)
    eyeX.value = withRepeat(
      withSequence(
        withTiming(0, { duration: T_PEEK }), // peek: eyes centered
        // Look phase: left → hold → right → hold → center
        withTiming(-1, { duration: 210, easing: Easing.out(Easing.ease) }),
        withTiming(-1, { duration: 260 }),
        withTiming(1, { duration: 240, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 250 }),
        withTiming(0, { duration: 240, easing: Easing.out(Easing.ease) }),
        withTiming(0, { duration: TOTAL - O_REVEAL }), // rest of cycle: centered
      ),
      -1,
      false,
    );

    return () => {
      cancelAnimation(peekY);
      cancelAnimation(eyeX);
    };
  }, [shouldAnimate]);

  // ── Tier 2: Animated.View — compositor-level, zero SVG cost ───────────────
  const faceSlideStyle = useAnimatedStyle(
    () => ({ transform: [{ translateY: peekY.value }] }),
    [],
  );

  // ── Tier 3: AnimatedG — only 2 circles, minimal SVG re-render ─────────────
  const eyeGroupProps = useAnimatedProps(
    () => ({
      transform: [{ translateX: eyeX.value * 2.5 }] as any,
    }),
    [],
  );

  return (
    // Tier 1: static native View — the gray circle background
    // overflow:hidden clips the sliding face below
    <View
      style={{
        width: activeWidth as any,
        height: activeHeight as any,
        borderRadius: (Number(activeWidth) || 48) / 2,
        overflow: "hidden",
        backgroundColor: transparentBg ? "transparent" : "#B0BEC5",
      }}
    >
      {/* Tier 2: slides on the native compositor thread */}
      <Animated.View
        style={[
          {
            position: "absolute",
            width: activeWidth as any,
            height: activeHeight as any,
          },
          faceSlideStyle,
        ]}
      >
        <Svg
          width={activeWidth}
          height={activeHeight}
          viewBox="0 0 48 48"
          fill="none"
          {...props}
        >
          {/* Face skin — static, never re-renders due to animation */}
          <Path
            fill="#ECEFF1"
            d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
          />
          {/* Eye whites — static */}
          <Circle cx="16" cy="22" r="4" fill="white" opacity={0.6} />
          <Circle cx="32" cy="21" r="4" fill="white" opacity={0.6} />
          {/* Tier 3: pupils only — 2 small circles, cheapest possible re-render */}
          <AnimatedG animatedProps={eyeGroupProps}>
            <Circle cx="16" cy="22" r="2.5" fill="#455A64" />
            <Circle cx="32" cy="21" r="2.5" fill="#455A64" />
          </AnimatedG>
          {/* Mouth — completely static, zero animation overhead */}
          <Path
            d="M14 34l2-2l2 3l3-4l3 5l3-5l3 4l2-3l2 2"
            stroke="#455A64"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </Animated.View>
    </View>
  );
};

export default React.memo(ErrorFace);
