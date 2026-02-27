import React, { useEffect } from "react";
import { View } from "react-native";
import Svg, { Defs, G, Mask, Path, Circle, SvgProps } from "react-native-svg";
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
const AnimatedPath = Animated.createAnimatedComponent(Path);

interface SvgIconProps extends SvgProps {
  shouldAnimate?: boolean;
  loop?: boolean;
  repeatCount?: number;
  size?: number | string;
  width?: number | string;
  height?: number | string;
}

const AnnoyedFace = ({
  size = 48,
  width,
  height,
  shouldAnimate = false,
  loop = false,
  repeatCount = 1,
  ...props
}: SvgIconProps) => {
  const activeWidth = width || size;
  const activeHeight = height || size;

  const blink = useSharedValue(1);
  const droop = useSharedValue(0);

  React.useEffect(() => {
    if (shouldAnimate) {
      blink.value = withRepeat(
        withSequence(
          withDelay(
            Math.random() * 2000 + 3000,
            withTiming(0.1, { duration: 150 }),
          ),
          withTiming(1, { duration: 150 }),
        ),
        -1,
        false,
      );
      droop.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 1000, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        true,
      );
    } else {
      blink.value = 1;
      droop.value = 0;
    }
  }, [shouldAnimate]);

  const eyeProps = useAnimatedProps(() => ({
    transform: [{ scaleY: blink.value }] as any,
    originY: 24,
  }));

  const lidProps = useAnimatedProps(() => ({
    transform: [{ translateY: droop.value * 1.2 }] as any,
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
            id="bored_mask"
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
        <G mask="url(#bored_mask)">
          {/* Background - Dull Greige */}
          <Path
            fill="#A1887F"
            d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
          />
          <G>
            {/* Face Shape - Pale Beige */}
            <Path
              fill="#EFEBE9"
              d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
            />
          </G>

          <AnimatedG animatedProps={eyeProps}>
            {/* Eyes (White) */}
            <Path
              fill="#fff"
              d="M16.8 31.2a7.2 7.2 0 1 0 0-14.4 7.2 7.2 0 0 0 0 14.4"
            />
            <Path
              fill="#fff"
              d="M31.2 31.2a7.2 7.2 0 1 0 0-14.4 7.2 7.2 0 0 0 0 14.4"
            />
            {/* Pupils (Looking slightly right, half covered) */}
            <Circle cx="18" cy="24" r="3" fill="#5D4037" />
            <Circle cx="32.4" cy="24" r="3" fill="#5D4037" />
          </AnimatedG>

          {/* Half-closed Eyelids (Flat lines covering top of eyes) */}
          <AnimatedG animatedProps={lidProps}>
            <Path fill="#EFEBE9" d="M9 22 L 25 22 L 25 16 L 9 16 Z" />
            <Path fill="#EFEBE9" d="M23 22 L 39 22 L 39 16 L 23 16 Z" />
            <Path stroke="#5D4037" strokeWidth="2" d="M10 22 L 23.6 22" />
            <Path stroke="#5D4037" strokeWidth="2" d="M24.4 22 L 38 22" />
          </AnimatedG>

          {/* Flat Unimpressed Mouth */}
          <Path
            stroke="#5D4037"
            strokeWidth="2.5"
            strokeLinecap="round"
            d="M20 34 L 28 34"
          />
        </G>
      </Svg>
    </View>
  );
};

export default React.memo(AnnoyedFace);
