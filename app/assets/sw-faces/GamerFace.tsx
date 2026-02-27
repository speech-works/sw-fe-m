import Animated, {
  useSharedValue,
  useAnimatedProps,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
} from "react-native-reanimated";

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
import React from "react";

const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedRect = Animated.createAnimatedComponent(Rect);

interface SvgIconProps extends SvgProps {
  size?: number | string;
  width?: number | string;
  height?: number | string;
  shouldAnimate?: boolean;
  loop?: boolean;
  repeatCount?: number;
}

const GamerFace = ({
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
  const pulse = useSharedValue(0);

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
      pulse.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1000 }),
          withTiming(0, { duration: 1000 }),
        ),
        -1,
        true,
      );
    } else {
      blink.value = 1;
      pulse.value = 0;
    }
  }, [shouldAnimate]);

  const eyeProps = useAnimatedProps(() => ({
    transform: [{ scaleY: blink.value }] as any,
    originY: 24,
  }));

  const blueLedProps = useAnimatedProps(() => ({
    opacity: 0.5 + pulse.value * 0.5,
  }));

  const redLedProps = useAnimatedProps(() => ({
    opacity: 1 - pulse.value * 0.5,
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
            id="gamer_mask"
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
        <G mask="url(#gamer_mask)">
          {/* Background - Gaming Purple */}
          <Path
            fill="#A259FB"
            d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
          />
          <G>
            <Path
              fill="#FFDABF"
              d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
            />
          </G>
          {/* Gaming Headset Band */}
          <Path
            stroke="#22252B"
            strokeWidth="4"
            fill="none"
            d="M4 24 C 4 12, 12 4, 24 4 C 36 4, 44 12, 44 24"
            strokeLinecap="round"
          />
          {/* RGB Ear Cups (Neon Green/Pink details) */}
          <Rect x="2" y="18" width="6" height="14" rx="2" fill="#333740" />
          <AnimatedRect
            x="4"
            y="22"
            width="2"
            height="6"
            rx="1"
            fill="#000AFF"
            animatedProps={blueLedProps}
          />{" "}
          {/* LED Light */}
          <Rect x="40" y="18" width="6" height="14" rx="2" fill="#333740" />
          <AnimatedRect
            x="42"
            y="22"
            width="2"
            height="6"
            rx="1"
            fill="#FF0000"
            animatedProps={redLedProps}
          />{" "}
          {/* LED Light */}
          <AnimatedG animatedProps={eyeProps}>
            {/* Eyes (Focused on screen) */}
            <Path
              fill="#fff"
              d="M16.8 31.2a7.2 7.2 0 1 0 0-14.4 7.2 7.2 0 0 0 0 14.4"
            />
            <Path
              fill="#fff"
              d="M31.2 31.2a7.2 7.2 0 1 0 0-14.4 7.2 7.2 0 0 0 0 14.4"
            />
            <Circle cx="16.8" cy="24" r="2.5" fill="#111215" />
            <Circle cx="31.2" cy="24" r="2.5" fill="#111215" />
          </AnimatedG>
          {/* Gamer Mic */}
          <Path
            stroke="#22252B"
            strokeWidth="2"
            fill="none"
            d="M40 28 L 32 36"
            strokeLinecap="round"
          />
          <Circle cx="32" cy="36" r="2" fill="#22252B" />
        </G>
      </Svg>
    </View>
  );
};
export default React.memo(GamerFace);
