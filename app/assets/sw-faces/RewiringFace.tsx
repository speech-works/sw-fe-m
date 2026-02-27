import React from "react";
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

const RewiringFace = ({
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
  const rotation = useSharedValue(0);

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
      rotation.value = withRepeat(
        withTiming(360, { duration: 3000, easing: Easing.linear }),
        -1,
        false,
      );
    } else {
      blink.value = 1;
      rotation.value = 0;
    }
  }, [shouldAnimate]);

  const eyeProps = useAnimatedProps(() => ({
    transform: [{ scaleY: blink.value }] as any,
    originY: 24,
  }));

  const spiralProps = useAnimatedProps(() => ({
    transform: [{ rotate: `${rotation.value}deg` }] as any,
    originX: 24,
    originY: 10,
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
            id="spiral_mask"
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

        <G mask="url(#spiral_mask)">
          {/* Background - Overwhelming Red (kept as original) */}
          <Path
            fill="#C62828"
            d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
          />
          {/* Face Shape - Pale/Stressed White (kept as original) */}
          <G>
            <Path
              fill="#F5F5F5"
              d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
            />
          </G>

          <AnimatedG animatedProps={eyeProps}>
            {/* Eyes (Updated to Happy, Open, and Confident) */}
            <Circle cx="17" cy="24" r="3" fill="#212121" />
            <Circle cx="31" cy="24" r="3" fill="#212121" />
            {/* Glints for sparkle in happy eyes */}
            <Circle cx="18.2" cy="22.8" r="0.8" fill="#FFFFFF" />
            <Circle cx="32.2" cy="22.8" r="0.8" fill="#FFFFFF" />
          </AnimatedG>

          {/* Mouth (Updated to a Broad, Confident Smile) */}
          <Path
            stroke="#424242"
            strokeWidth="3"
            strokeLinecap="round"
            d="M18 32 Q 24 37, 30 32"
            fill="none"
          />
          {/* Worry Prop (Giant spiral on forehead - kept as original) */}
          <AnimatedPath
            stroke="#D32F2F"
            strokeWidth="2.5"
            fill="none"
            d="M24 10 A 10 10 0 1 1 24 10.1 M24 15 A 5 5 0 1 1 24 15.1"
            animatedProps={spiralProps}
          />
        </G>
      </Svg>
    </View>
  );
};
export default React.memo(RewiringFace);
