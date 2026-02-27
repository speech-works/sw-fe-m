import React from "react";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  interpolate,
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

const PilotFace = ({
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
  const glint = useSharedValue(0);

  React.useEffect(() => {
    if (shouldAnimate) {
      blink.value = withRepeat(
        withSequence(
          withDelay(
            Math.random() * 2000 + 3000,
            withTiming(0, { duration: 150 }),
          ),
          withTiming(1, { duration: 150 }),
        ),
        -1,
        false,
      );
      glint.value = withRepeat(
        withSequence(
          withDelay(2000, withTiming(1, { duration: 1000 })),
          withTiming(0, { duration: 0 }),
        ),
        -1,
        false,
      );
    } else {
      blink.value = 1;
      glint.value = 0;
    }
  }, [shouldAnimate]);

  const eyeProps = useAnimatedProps(() => ({
    transform: [{ scaleY: blink.value }] as any,
    originY: 24,
  }));

  const glintProps = useAnimatedProps(() => ({
    opacity: interpolate(glint.value, [0, 0.5, 1], [0.4, 0.8, 0.4]),
    transform: [{ translateX: glint.value * 4 - 2 }] as any,
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
            id="pilot_mask"
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
        <G mask="url(#pilot_mask)">
          {/* Background - Vivid Aviation Blue */}
          <Path
            fill="#0288D1"
            d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
          />

          <G>
            {/* Face Color - Natural Skin Tone */}
            <Path
              fill="#FFCCBC"
              d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
            />
          </G>

          {/* Aviator Goggles - Vintage Style */}
          <G transform="translate(0, -6)">
            {/* Leather Strap (Dark Brown) */}
            <Path
              fill="#4E342E"
              d="M8 14 C 8 14, 14 10, 24 12 C 34 10, 40 14, 40 14"
              stroke="#3E2723"
              strokeWidth="4"
            />

            {/* Lenses (Dark Grey Tint) with Silver Rims */}
            <Circle
              cx="16"
              cy="14"
              r="6"
              fill="#37474F"
              stroke="#CFD8DC"
              strokeWidth="2"
            />
            <Circle
              cx="32"
              cy="14"
              r="6"
              fill="#37474F"
              stroke="#CFD8DC"
              strokeWidth="2"
            />

            {/* Bridge (Silver) */}
            <Path stroke="#CFD8DC" strokeWidth="2" d="M22 14 L 26 14" />

            {/* Glint on goggles (White Reflection) */}
            <AnimatedPath
              stroke="#FFF"
              strokeWidth="2"
              d="M14 12 L 16 12"
              animatedProps={glintProps}
            />
            <AnimatedPath
              stroke="#FFF"
              strokeWidth="2"
              d="M30 12 L 32 12"
              animatedProps={glintProps}
            />
          </G>

          <AnimatedG animatedProps={eyeProps}>
            {/* Eyes (Sclera) */}
            <Path
              fill="#fff"
              d="M16.8 31.2a7.2 7.2 0 1 0 0-14.4 7.2 7.2 0 0 0 0 14.4"
            />
            <Path
              fill="#fff"
              d="M31.2 31.2a7.2 7.2 0 1 0 0-14.4 7.2 7.2 0 0 0 0 14.4"
            />
            {/* Pupils (Matching Leather Dark Brown) */}
            <Circle cx="16.8" cy="24" r="2.5" fill="#3E2723" />
            <Circle cx="31.2" cy="24" r="2.5" fill="#3E2723" />
          </AnimatedG>

          {/* Confident Smile (Matching Leather Dark Brown) */}
          <Path
            stroke="#3E2723"
            strokeWidth="2.5"
            strokeLinecap="round"
            d="M20 34 Q 24 36, 28 34"
            fill="none"
          />
        </G>
      </Svg>
    </View>
  );
};
export default React.memo(PilotFace);
