import Animated, {
  useSharedValue,
  useAnimatedProps,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
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

interface SvgIconProps extends SvgProps {
  size?: number | string;
  width?: number | string;
  height?: number | string;
  shouldAnimate?: boolean;
  loop?: boolean;
  repeatCount?: number;
}

const HeadphoneFace = ({
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
  const float = useSharedValue(0);

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
      float.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true,
      );
    } else {
      blink.value = 1;
      float.value = 0;
    }
  }, [shouldAnimate]);

  const eyeProps = useAnimatedProps(() => ({
    transform: [{ scaleY: blink.value }] as any,
    originY: 28,
  }));

  const thumbnailProps = useAnimatedProps(() => ({
    transform: [
      { translateY: float.value * -2 },
      { rotate: `${10 + float.value * 2}deg` },
    ] as any,
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
          <Mask id="mask_playlist_berry">
            <Circle cx="24" cy="24" r="24" fill="#fff" />
          </Mask>
        </Defs>

        <G mask="url(#mask_playlist_berry)">
          {/* Background: Deep Pink */}
          <Circle cx="24" cy="24" r="24" fill="#AD1457" />

          {/* Background Element: Stacked Video Thumbnails */}
          <AnimatedG
            animatedProps={thumbnailProps}
            transform="translate(24, 16)"
          >
            <Rect
              x="-18"
              y="-10"
              width="36"
              height="20"
              rx="4"
              fill="#EC407A"
              opacity={0.5}
              transform="translate(0, -8) scale(0.9)"
            />
            <Rect
              x="-18"
              y="-10"
              width="36"
              height="20"
              rx="4"
              fill="#F48FB1"
              opacity={0.7}
              transform="translate(0, -4) scale(0.95)"
            />
            <Rect
              x="-18"
              y="-10"
              width="36"
              height="20"
              rx="4"
              fill="#F8BBD0"
            />
            {/* Play icon */}
            <Path d="M-4 -4 L 6 0 L -4 4 Z" fill="#AD1457" />
          </AnimatedG>

          {/* Character */}
          <G transform="translate(0, 10)">
            <G>
              <Path
                fill="#FFECB3"
                d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
              />
            </G>
            <Path
              d="M7 20 C 15 8, 33 8, 41 20"
              stroke="#F8BBD0"
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
            />
            <Circle cx="7" cy="24" r="5" fill="#D81B60" />
            <Circle cx="41" cy="24" r="5" fill="#D81B60" />
            <AnimatedG animatedProps={eyeProps}>
              <Path
                d="M14 28 Q 18 26, 22 28"
                stroke="#3E2723"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <Path
                d="M26 28 Q 30 26, 34 28"
                stroke="#3E2723"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </AnimatedG>
            <Path
              d="M20 35 Q 24 38, 28 35"
              stroke="#3E2723"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
            />
          </G>
        </G>
      </Svg>
    </View>
  );
};
export default React.memo(HeadphoneFace);
