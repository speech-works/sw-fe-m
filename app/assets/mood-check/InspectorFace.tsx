import React, { useEffect } from "react";
import { View } from "react-native";
import Svg, { Circle, Defs, G, Mask, Path, SvgProps } from "react-native-svg";
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
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface SvgIconProps extends SvgProps {
  shouldAnimate?: boolean;
  loop?: boolean;
  repeatCount?: number;
  size?: number | string;
  width?: number | string;
  height?: number | string;
}

const InspectorFace = ({
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
  const shimmer = useSharedValue(0);

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
      shimmer.value = withRepeat(
        withSequence(
          withDelay(2000, withTiming(1, { duration: 800 })),
          withTiming(0, { duration: 0 }),
        ),
        -1,
        false,
      );
    } else {
      blink.value = 1;
      shimmer.value = 0;
    }
  }, [shouldAnimate]);

  const eyeProps = useAnimatedProps(() => ({
    transform: [{ scaleY: blink.value }] as any,
    originY: 24,
  }));

  const shimmerProps = useAnimatedProps(() => ({
    opacity: 0.5 + shimmer.value * 0.3,
    strokeWidth: 2 + shimmer.value * 1,
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
            id="inspector_mask"
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
        <G mask="url(#inspector_mask)">
          {/* Background - Serious Grey/Blue */}
          <Path
            fill="#607D8B"
            d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
          />
          <G>
            {/* Face Shape */}
            <Path
              fill="#CFD8DC"
              d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
            />
          </G>

          <AnimatedG animatedProps={eyeProps}>
            {/* Left Eye (Normal size) */}
            <Path
              fill="#fff"
              d="M16.8 31.2a7.2 7.2 0 1 0 0-14.4 7.2 7.2 0 0 0 0 14.4"
            />
            <Circle cx="16.8" cy="24" r="3" fill="#37474F" />

            {/* Right Eye (MAGNIFIED inside the lens) */}
            <Path fill="#fff" d="M30 34 a 10 10 0 1 0 0-20 10 10 0 0 0 0 20" />
            <Circle cx="30" cy="24" r="4.5" fill="#37474F" />
          </AnimatedG>

          {/* Magnifying Glass Handle */}
          <Path
            stroke="#37474F"
            strokeWidth="3"
            strokeLinecap="round"
            d="M36 36 L 42 42"
          />

          {/* Magnifying Glass Lens Rim */}
          <AnimatedCircle
            cx="30"
            cy="24"
            r="11"
            stroke="#37474F"
            fill="#E0F7FA"
            animatedProps={shimmerProps}
          />

          {/* Scrutinizing Mouth */}
          <Path
            stroke="#37474F"
            strokeWidth="2.5"
            strokeLinecap="round"
            d="M18 36 Q 22 38, 26 36"
          />
        </G>
      </Svg>
    </View>
  );
};

export default React.memo(InspectorFace);
