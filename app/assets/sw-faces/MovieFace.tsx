import React, { useEffect } from "react";
import Svg, {
  ClipPath,
  Path,
  G,
  Defs,
  SvgProps,
  Rect,
  Circle } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing } from "react-native-reanimated";

const AnimatedPath = Animated.createAnimatedComponent(Path);

interface SvgIconProps extends SvgProps {
  size?: number | string;
  shouldAnimate?: boolean;
  loop?: boolean;
  repeatCount?: number;
}

const MovieFace = ({
  size = 48,
  shouldAnimate = false,
  loop = false,
  repeatCount = 1,
  ...props
}: SvgIconProps) => {
  const activeWidth = typeof size === "number" ? size : size;
  const activeHeight = typeof size === "number" ? size : size;
  const sheenProgress = useSharedValue(0);

  useEffect(() => {
    if (shouldAnimate) {
      sheenProgress.value = withRepeat(
        withDelay(
          2500, // Wait interval
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.quad) }) // Swipe across
        ),
        loop ? -1 : repeatCount,
        false // Start over (unidirectional)
      );
    } else {
      sheenProgress.value = withTiming(0);
    }
  }, [shouldAnimate, loop, repeatCount]);

  const glareProps = useAnimatedProps(() => {
    // Translate across the width of the lens (10px) + buffer
    const translateX = -5 + sheenProgress.value * 20; // -5 -> 15 (Travels 20px total)
    return {
      transform: [{ translateX }] };
  });

  return (
    <Svg
      width={activeWidth}
      height={activeHeight}
      viewBox="0 0 48 48"
      fill="none"
      {...props}
    >
      <Defs>
        <ClipPath id="3d_mask">
          <Path
            fill="#fff"
            d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
          />
        </ClipPath>
        {/* ClipPath for Lenses to contain the sheen */}
        <ClipPath id="lens_mask">
          <Rect x="12" y="22" width="10" height="6" rx="1" fill="white" />
          <Rect x="26" y="22" width="10" height="6" rx="1" fill="white" />
        </ClipPath>
      </Defs>
      <G clipPath="url(#3d_mask)">
        <Path
          fill="#5200B7"
          d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
        />
        {/* Shadow - Vector approximation */}
        <Path
          fill="black"
          opacity={0.25}
          transform="translate(4, 4)"
          d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
        />
        {/* Face Shape */}
        <Path
          fill="#FFDABF"
          d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
        />
        <G transform="translate(0, -2)">
          <Path fill="#FFF" d="M8 20 H 40 V 30 H 8 Z" />

          {/* Lenses Base Layer */}
          <Rect
            x="12"
            y="22"
            width="10"
            height="6"
            rx="1"
            fill="#FF4040"
            opacity="0.9"
          />
          <Rect
            x="26"
            y="22"
            width="10"
            height="6"
            rx="1"
            fill="#4047FF"
            opacity="0.9"
          />

          {/* Sheen Layer - Masked to Lenses */}
          <G clipPath="url(#lens_mask)">
            {/* Left Lens Sheen */}
            <AnimatedPath
              animatedProps={glareProps}
              fill="#FFF"
              opacity="0.6"
              d="M14 21 L 17 21 L 15 29 L 12 29 Z"
            />
            {/* Right Lens Sheen */}
            <AnimatedPath
              animatedProps={glareProps}
              fill="#FFF"
              opacity="0.6"
              d="M28 21 L 31 21 L 29 29 L 26 29 Z"
            />
          </G>

          <Path stroke="#FFF" strokeWidth="2" d="M8 22 L 4 20" />
          <Path stroke="#FFF" strokeWidth="2" d="M40 22 L 44 20" />
        </G>
        <Circle
          cx="24"
          cy="36"
          r="2.5"
          stroke="#111215"
          strokeWidth="2"
          fill="none"
        />
      </G>
    </Svg>
  );
};

export default React.memo(MovieFace);
