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

const ConfusedFace = ({
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
  const wiggle = useSharedValue(0);

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
      wiggle.value = withRepeat(
        withSequence(
          withTiming(-3, { duration: 500, easing: Easing.inOut(Easing.sin) }),
          withTiming(3, { duration: 500, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true,
      );
    } else {
      blink.value = 1;
      wiggle.value = 0;
    }
  }, [shouldAnimate]);

  const eyeProps = useAnimatedProps(() => ({
    transform: [{ scaleY: blink.value }] as any,
    originY: 24,
  }));

  const wiggleProps = useAnimatedProps(() => ({
    transform: [{ rotate: `${wiggle.value}deg` }] as any,
    originX: 38,
    originY: 20,
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
            id="confused_mask"
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
        <G mask="url(#confused_mask)">
          {/* Background - Dusty Purple */}
          <Path
            fill="#9575CD"
            d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
          />
          <G>
            {/* Face Shape - Pale Purple */}
            <Path
              fill="#EDE7F6"
              d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
            />
          </G>

          <AnimatedG animatedProps={eyeProps}>
            {/* Left Eye (Normal) */}
            <Path
              fill="#fff"
              d="M16.8 31.2a7.2 7.2 0 1 0 0-14.4 7.2 7.2 0 0 0 0 14.4"
            />
            <Circle cx="16.8" cy="24" r="3" fill="#4527A0" />

            {/* Right Eye (Squinting/Small) */}
            <Path fill="#fff" d="M31.2 29 a 5 5 0 1 0 0-10 5 5 0 0 0 0 10" />
            <Circle cx="31.2" cy="24" r="2" fill="#4527A0" />
          </AnimatedG>

          {/* Crooked Mouth */}
          <Path
            stroke="#4527A0"
            strokeWidth="2.5"
            strokeLinecap="round"
            d="M18 36 L 24 34 L 30 36"
          />

          {/* Question Mark */}
          <AnimatedG animatedProps={wiggleProps}>
            <Path
              stroke="#fff"
              strokeWidth="3"
              strokeLinecap="round"
              d="M38 12 C 38 12, 42 12, 42 16 C 42 18, 38 18, 38 22"
              fill="none"
            />
            <Circle cx="38" cy="26" r="1.5" fill="#fff" />
          </AnimatedG>
        </G>
      </Svg>
    </View>
  );
};

export default React.memo(ConfusedFace);
