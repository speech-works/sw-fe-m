import React, { useEffect } from "react";
import { View } from "react-native";
import Svg, {
  Circle,
  Defs,
  G,
  Mask,
  Path,
  Rect,
  SvgProps,
} from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";

const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedRect = Animated.createAnimatedComponent(Rect);

interface SvgIconProps extends SvgProps {
  shouldAnimate?: boolean;
  loop?: boolean;
  repeatCount?: number;
  size?: number | string;
  width?: number | string;
  height?: number | string;
  transparentBg?: boolean;
}

const FinishLineCoolFace = ({
  size = 48,
  width,
  height,
  shouldAnimate = true,
  loop,
  repeatCount,
  transparentBg,
  ...props
}: SvgIconProps) => {
  const activeWidth = width || size;
  const activeHeight = height || size;

  const blink = useSharedValue(1);
  const wiggle = useSharedValue(0);

  React.useEffect(() => {
    if (shouldAnimate) {
      blink.value = withRepeat(
        withSequence(
          withDelay(
            Math.random() * 2000 + 4000,
            withTiming(0.1, { duration: 150 }),
          ),
          withTiming(1, { duration: 150 }),
        ),
        -1,
        false,
      );
      wiggle.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 150, easing: Easing.linear }),
          withTiming(0, { duration: 150, easing: Easing.linear }),
        ),
        -1,
        false,
      );
    } else {
      blink.value = 1;
      wiggle.value = 0;
    }
  }, [shouldAnimate]);

  const leftTapeProps = useAnimatedProps(() => {
    const rotate = wiggle.value * 12;
    const scaleX = 1 - Math.sin(wiggle.value * Math.PI) * 0.1;
    return {
      transform: [
        { translateX: 10 },
        { translateY: 40 },
        { rotate: `${rotate}deg` },
        { scaleX },
        { translateX: -10 },
        { translateY: -40 },
      ] as any,
    };
  });

  const rightTapeProps = useAnimatedProps(() => {
    const rotate = (1 - wiggle.value) * -12;
    const scaleX = 1 - Math.sin(wiggle.value * Math.PI) * 0.1;
    return {
      transform: [
        { translateX: 38 },
        { translateY: 40 },
        { rotate: `${rotate}deg` },
        { scaleX },
        { translateX: -38 },
        { translateY: -40 },
      ] as any,
    };
  });

  const faceProps = useAnimatedProps(() => ({
    transform: [{ scaleY: blink.value }] as any,
    originY: 24,
  }));

  return (
    <View
      style={{
        width: activeWidth as any,
        height: activeHeight as any,
        borderRadius: (typeof activeWidth === "number" ? activeWidth : 48) / 2,
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
          <Mask
            id="finish_cool_mask"
            x="0"
            y="0"
            width="48"
            height="48"
            maskUnits="userSpaceOnUse"
          >
            <Path
              fill="#fff"
              d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
            />
          </Mask>
        </Defs>
        <G mask="url(#finish_cool_mask)">
          {/* Background - Victory Gold/Yellow */}
          {!transparentBg && (
            <Path
              fill="#FFC107"
              d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
            />
          )}

          <AnimatedG animatedProps={faceProps}>
            <Path
              fill="#FFCCBC"
              d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
            />

            {/* --- COOL SUNGLASSES --- */}
            <G>
              <Path
                fill="#263238"
                d="M8 22 C 8 22, 10 29, 17 29 C 22 29, 22 22, 22 22 L 8 22 Z"
              />
              <Path
                fill="#263238"
                d="M26 22 C 26 22, 28 29, 35 29 C 40 29, 40 22, 40 22 L 26 22 Z"
              />
              <Path stroke="#263238" strokeWidth="2.5" d="M22 23 L 26 23" />
              <Path fill="#546E7A" opacity="0.5" d="M10 23 L 15 23 L 10 27 Z" />
              <Path fill="#546E7A" opacity="0.5" d="M28 23 L 33 23 L 28 27 Z" />
            </G>
          </AnimatedG>

          {/* --- SMART SMIRK --- */}
          <Path
            stroke="#BF360C"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
            d="M22 35 Q 26 37, 30 33"
          />

          {/* Checkered Tape Snapping */}
          <AnimatedG animatedProps={leftTapeProps}>
            <Rect x="0" y="38" width="20" height="6" fill="#FFF" />
            <Rect x="0" y="38" width="5" height="3" fill="#000" />
            <Rect x="10" y="38" width="5" height="3" fill="#000" />
            <Rect x="5" y="41" width="5" height="3" fill="#000" />
            <Rect x="15" y="41" width="5" height="3" fill="#000" />
          </AnimatedG>
          <AnimatedG animatedProps={rightTapeProps}>
            <Rect x="28" y="38" width="20" height="6" fill="#FFF" />
            <Rect x="28" y="38" width="5" height="3" fill="#000" />
            <Rect x="38" y="38" width="5" height="3" fill="#000" />
            <Rect x="33" y="41" width="5" height="3" fill="#000" />
            <Rect x="43" y="41" width="5" height="3" fill="#000" />
          </AnimatedG>

          {/* Confetti bits */}
          <Rect
            x="10"
            y="10"
            width="3"
            height="3"
            fill="#FFF"
            transform="rotate(45 10 10)"
          />
          <Rect
            x="38"
            y="12"
            width="3"
            height="3"
            fill="#000"
            transform="rotate(20 38 12)"
          />
          <Circle cx="24" cy="8" r="1.5" fill="#FFF" />
        </G>
      </Svg>
    </View>
  );
};

export default React.memo(FinishLineCoolFace);
