import React, { useEffect } from "react";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  interpolate,
  useDerivedValue,
} from "react-native-reanimated";

import { View } from "react-native";
import Svg, { Circle, Defs, G, Mask, Path, SvgProps } from "react-native-svg";

const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
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
  ...props
}: SvgIconProps) => {
  const activeWidth = width || size;
  const activeHeight = height || size;
  const blink = useSharedValue(1);
  const glint = useSharedValue(0);

  useEffect(() => {
    if (shouldAnimate) {
      blink.value = withRepeat(
        withSequence(
          withDelay(
            Math.random() * 2000 + 3000,
            withTiming(0, { duration: 120 }),
          ),
          withTiming(1, { duration: 120 }),
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

  const blinkS = useDerivedValue(() => blink.value);
  const glintOp = useDerivedValue(() =>
    interpolate(glint.value, [0, 0.5, 1], [0.4, 0.8, 0.4]),
  );
  const glintX = useDerivedValue(() => glint.value * 4 - 2);

  // Optimized eyeProps to apply directly to individual eye components
  const eyeTransformProps = useAnimatedProps(() => ({
    transform: [{ scaleY: blinkS.value }] as any,
    originY: 24,
  }));

  const glintProps = useAnimatedProps(() => ({
    opacity: glintOp.value,
    transform: [{ translateX: glintX.value }],
  }));

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
          <Mask
            id="piM"
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
        <G mask="url(#piM)">
          <Path
            fill="#0288D1"
            d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
          />
          <Path
            fill="#FFCCBC"
            d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
          />
          {/* Goggles and glints - flattened structure */}
          <G transform="translate(0, -6)">
            <Path
              fill="#4E342E"
              d="M8 14c0 0 6-4 16-2c10-2 16 2 16 2"
              stroke="#3E2723"
              strokeWidth="4"
            />
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
            <Path stroke="#CFD8DC" strokeWidth="2" d="M22 14h4" />
            {/* Glints are animated directly */}
            <AnimatedPath
              stroke="#FFF"
              strokeWidth="2"
              d="M14 12h2"
              animatedProps={glintProps}
            />
            <AnimatedPath
              stroke="#FFF"
              strokeWidth="2"
              d="M30 12h2"
              animatedProps={glintProps}
            />
          </G>
          {/* Eyes - animated directly */}
          <AnimatedPath
            fill="#fff"
            d="M16.8 31.2a7.2 7.2 0 1 0 0-14.4 7.2 7.2 0 0 0 0 14.4M31.2 31.2a7.2 7.2 0 1 0 0-14.4 7.2 7.2 0 0 0 0 14.4"
            animatedProps={eyeTransformProps}
          />
          <AnimatedCircle
            cx="16.8"
            cy="24"
            r="2.5"
            fill="#3E2723"
            animatedProps={eyeTransformProps}
          />
          <AnimatedCircle
            cx="31.2"
            cy="24"
            r="2.5"
            fill="#3E2723"
            animatedProps={eyeTransformProps}
          />
          <Path
            stroke="#3E2723"
            strokeWidth="2.5"
            strokeLinecap="round"
            d="M20 34q4 2 8 0"
            fill="none"
          />
        </G>
      </Svg>
    </View>
  );
};
export default React.memo(PilotFace);
