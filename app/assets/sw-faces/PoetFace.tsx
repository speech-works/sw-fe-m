import React from "react";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
} from "react-native-reanimated";

import { View } from "react-native";
import Svg, { Circle, Defs, G, Mask, Path, SvgProps } from "react-native-svg";

const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedPath = Animated.createAnimatedComponent(Path);

interface SvgIconProps extends SvgProps {
  size?: number | string;
  width?: number | string;
  height?: number | string;
  shouldAnimate?: boolean;
  loop?: boolean;
  repeatCount?: number;
}

const PoetFace = ({
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
          withTiming(1, { duration: 1200 }),
          withTiming(0, { duration: 1200 }),
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
    originY: 23.5,
  }));

  const hairProps = useAnimatedProps(() => ({
    transform: [{ translateY: wiggle.value * 0.5 }] as any,
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
            id="narrator_mask"
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

        <G mask="url(#narrator_mask)">
          {/* Background - Sunny Yellow */}
          <Path
            fill="#c49ccdff"
            d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
          />
          {/* Face Shape - Light Tan */}
          <G>
            <Path
              fill="#edcfbbff" /* Light Tan */
              d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
            />
          </G>

          <AnimatedG animatedProps={hairProps}>
            {/* Cartoonish Side Hair (Spiky Brown) */}
            <G fill="#795548">
              <Path d="M4 18 C 4 11, 7 8, 10 8 C 13 9, 12 17, 9 28 Z" />
              <Path d="M44 18 C 44 11, 41 8, 38 8 C 35 9, 36 17, 39 28 Z" />
            </G>
          </AnimatedG>

          {/* Thick Reading Glasses (Cartoon style) - Thick Green frames */}
          <G
            stroke="#4CAF50"
            strokeWidth="4"
            fill="#B0BEC5"
            strokeLinecap="round"
          >
            <Circle cx="16.8" cy="24" r="8" />
            <Circle cx="31.2" cy="24" r="8" />
            <Path d="M24.8 24 L 23.2 24" />
            <Path d="M10 24 L 7 24" />
            <Path d="M38 24 L 41 24" />
          </G>
          {/* Lenses fill (lighter blue tint) */}
          <Circle cx="16.8" cy="24" r="6" fill="#E0F2F7" opacity="0.8" />
          <Circle cx="31.2" cy="24" r="6" fill="#E0F2F7" opacity="0.8" />

          <AnimatedG animatedProps={eyeProps}>
            {/* Eyes (Wide-eyed excitement) */}
            <Circle cx="16.8" cy="23" r="3" fill="#212121" />
            <Circle cx="31.2" cy="23" r="3" fill="#212121" />
            <Circle cx="17.5" cy="22" r="0.8" fill="#FFF" opacity="1" />
            <Circle cx="31.9" cy="22" r="0.8" fill="#FFF" opacity="1" />
          </AnimatedG>

          {/* --- MOUTH: Quiet Satisfaction (Content/Serene) --- */}
          <G transform="translate(0, -3)">
            <Path
              d="M21 37 Q 24 38, 27 37"
              stroke="#212121"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
            />
          </G>
        </G>
      </Svg>
    </View>
  );
};
export default React.memo(PoetFace);
