import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Svg, {
  Circle,
  Defs,
  G,
  Mask,
  Path,
  Rect,
  SvgProps,
} from "react-native-svg";

// Created once at module level — never re-created on render
const AnimatedG = Animated.createAnimatedComponent(G) as any;
const AnimatedRect = Animated.createAnimatedComponent(Rect) as any;

interface SvgIconProps extends SvgProps {
  shouldAnimate?: boolean;
  size?: number | string;
  width?: number | string;
  height?: number | string;
  transparentBg?: boolean;
}

const TherapistFace = ({
  size = 48,
  width,
  height,
  shouldAnimate = false,
  transparentBg,
  ...props
}: SvgIconProps) => {
  const activeWidth = width || size;
  const activeHeight = height || size;

  // Three shared values driving three independent animation loops.
  // All run entirely on the Reanimated UI thread.
  const blink = useSharedValue(1);
  const write = useSharedValue(0);
  const lookDown = useSharedValue(0);

  useEffect(() => {
    if (shouldAnimate) {
      // Eyelid close: ease-in (acceleration like real lids).
      // Eyelid open: ease-out (deceleration like real lids).
      // Math.random() is called on the JS thread inside useEffect — safe.
      blink.value = withRepeat(
        withSequence(
          withDelay(
            Math.random() * 2000 + 3000,
            withTiming(0, { duration: 100, easing: Easing.in(Easing.ease) }),
          ),
          withTiming(1, { duration: 100, easing: Easing.out(Easing.ease) }),
        ),
        -1,
        false,
      );

      lookDown.value = withRepeat(
        withSequence(
          withDelay(
            2000,
            withTiming(1, {
              duration: 1500,
              easing: Easing.inOut(Easing.ease),
            }),
          ),
          withDelay(
            2000,
            withTiming(0, {
              duration: 1500,
              easing: Easing.inOut(Easing.ease),
            }),
          ),
        ),
        -1,
        false,
      );

      write.value = withRepeat(
        withSequence(
          withDelay(3500, withTiming(1, { duration: 400 })),
          withTiming(0, { duration: 400 }),
          withTiming(1, { duration: 400 }),
          withTiming(0, { duration: 400 }),
          withTiming(1, { duration: 400 }),
          withTiming(0, { duration: 1500 }),
        ),
        -1,
        false,
      );
    } else {
      blink.value = withTiming(1, { duration: 150 });
      write.value = withTiming(0, { duration: 300 });
      lookDown.value = withTiming(0, { duration: 300 });
    }

    return () => {
      cancelAnimation(blink);
      cancelAnimation(write);
      cancelAnimation(lookDown);
    };
  }, [shouldAnimate]);

  // Merged face + eye props into a single AnimatedG.
  // One useAnimatedProps instead of two = half the per-frame worklet calls.
  // Uses manual translate-scale-untranslate around the eye center (cx=16/32, cy=26)
  // to avoid the buggy `originY` SVG prop.
  const faceAndEyeProps = useAnimatedProps(() => {
    const clampedDown = Math.max(0, lookDown.value);
    const clampedBlink = Math.max(0, blink.value);
    return {
      // Face slides down slightly when looking down
      transform: [{ translateY: clampedDown * 2 }],
      // Eyes: translate to center → scale → translate back, then add lookDown offset.
      // Nested AnimatedG handles blink via scaleY.
    };
  }, []);

  const eyeBlinkProps = useAnimatedProps(() => {
    const clampedDown = Math.max(0, lookDown.value);
    const clampedBlink = Math.max(0, blink.value);
    return {
      // Manual pivot around eye Y center (26) to avoid originY bug
      transform: [
        { translateY: clampedDown * 2.5 },
        { translateY: 26 },
        { scaleY: clampedBlink },
        { translateY: -26 },
      ],
    };
  }, []);

  const penProps = useAnimatedProps(() => {
    const penX = write.value * 2;
    const penY = write.value * -1;
    return {
      transform: [
        { translateX: penX },
        { translateY: penY },
        { translateX: 32 },
        { translateY: 51 },
        { rotateZ: "35deg" },
        { translateX: -32 },
        { translateY: -51 },
      ],
    };
  }, []);

  return (
    <View
      style={{
        width: activeWidth as any,
        height: activeHeight as any,
        borderRadius: (Number(activeWidth) || 48) / 2,
        overflow: "hidden",
      }}
    >
      <Svg
        width={activeWidth}
        height={activeHeight}
        viewBox="0 0 48 48"
        fill="none"
        {...props}
      >
        <Defs>
          <Mask id="theM">
            <Path
              fill="#fff"
              d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
            />
          </Mask>
        </Defs>
        <G clipPath="url(#theM)">
          {!transparentBg && (
            <Path
              fill="#BBDEFB"
              d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
            />
          )}
          <Path
            fill="black"
            opacity={0.25}
            transform="translate(4, 4)"
            d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
          />
          <Path
            fill="#F5F5F5"
            d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
          />
          {/* Static hair circles */}
          <G fill="#F5F5F5">
            <Circle cx="10" cy="14" r="4" />
            <Circle cx="14" cy="11" r="4" />
            <Circle cx="20" cy="9" r="4" />
            <Circle cx="28" cy="9" r="4" />
            <Circle cx="34" cy="11" r="4" />
            <Circle cx="38" cy="14" r="4" />
            <Circle cx="8" cy="20" r="3" />
            <Circle cx="40" cy="20" r="3" />
          </G>
          <Path
            d="M12 19q4-1 8 0M28 19q4-1 8 0"
            stroke="#F5F5F5"
            strokeWidth="3"
            strokeLinecap="round"
          />
          {/* Animated face group (lookDown drives translateY) */}
          <AnimatedG animatedProps={faceAndEyeProps}>
            <G stroke="#3E2723" strokeWidth="2.5" fill="none">
              <Rect x="10" y="20" width="12" height="12" rx="3" />
              <Rect x="26" y="20" width="12" height="12" rx="3" />
              <Path d="M22 26h4" strokeWidth="2" />
            </G>
            <Rect
              x="11"
              y="21"
              width="10"
              height="10"
              rx="2"
              fill="#FFF"
              opacity="0.3"
            />
            <Rect
              x="27"
              y="21"
              width="10"
              height="10"
              rx="2"
              fill="#FFF"
              opacity="0.3"
            />
            {/* Eye pupils — separate AnimatedG for blink scaleY */}
            <AnimatedG animatedProps={eyeBlinkProps}>
              <Circle cx="16" cy="26" r="1.5" fill="#3E2723" />
              <Circle cx="32" cy="26" r="1.5" fill="#3E2723" />
            </AnimatedG>
            <Path
              d="M20 36q4 2 8 0"
              stroke="#3E2723"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </AnimatedG>
          {/* Static ear details */}
          <Path
            d="M9 26q-2-2 0-4M39 26q2-2 0-4"
            stroke="#E0E0E0"
            strokeWidth="1"
          />
          {/* Clipboard + animated pen */}
          <G transform="translate(-9, -3)">
            <AnimatedG animatedProps={penProps}>
              {/* Pen Body */}
              {/* Pen Body (Rounded rear end) */}
              <Path
                d="M 30 37 L 30 47 L 34 47 L 34 37 A 2 2 0 0 0 30 37 Z"
                fill="#EF5350"
                stroke="#C62828"
                strokeWidth="0.5"
              />
              {/* Conical Tip */}
              <Path
                d="M30 47 L34 47 L32 51 Z"
                fill="#FFCCBC"
                stroke="#C62828"
                strokeWidth="0.5"
              />
              {/* Lead/Nib */}
              <Path d="M31.5 50 L32.5 50 L32 51 Z" fill="#3E2723" />
            </AnimatedG>
            <Rect
              x="14"
              y="36"
              width="20"
              height="30"
              rx="1"
              fill="#8D6E63"
              stroke="#5D4037"
              strokeLinecap="round"
            />
            <Rect x="16" y="38" width="16" height="30" fill="#FFF" />
            <Path
              d="M18 41h12M18 44h8M18 47h10M18 50h12"
              stroke="#BDBDBD"
              strokeWidth="1"
            />
            <Rect
              x="20"
              y="35"
              width="8"
              height="3"
              rx="0.5"
              fill="#B0BEC5"
              stroke="#78909C"
            />
          </G>
        </G>
      </Svg>
    </View>
  );
};

export default React.memo(TherapistFace);
