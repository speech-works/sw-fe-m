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
import Svg, {
  Circle,
  Defs,
  G,
  Mask,
  Path,
  Rect,
  SvgProps,
} from "react-native-svg";

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

const OnCallFace = ({
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
            withTiming(0, { duration: 150 }),
          ),
          withTiming(1, { duration: 150 }),
        ),
        -1,
        false,
      );
      wiggle.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1000 }),
          withTiming(0, { duration: 1000 }),
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

  const micProps = useAnimatedProps(() => ({
    transform: [{ translateX: wiggle.value * 1 }] as any,
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
            id="speaker_mask_theme"
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
        <G mask="url(#speaker_mask_theme)">
          {/* Background - New Theme Orange */}
          <Path
            fill="#FF9040"
            d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
          />

          <G>
            {/* Face - Lighter tint of theme color */}
            <Path
              fill="#FFB77F"
              d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
            />
          </G>

          {/* Headset Band - Warm dark brown */}
          <Path
            stroke="#5D403 brown"
            strokeWidth="2.5"
            fill="none"
            d="M6 22 C 6 12, 14 4, 24 4 C 34 4, 42 12, 42 22"
            strokeLinecap="round"
          />

          {/* Earpiece (Right side) - Deeper brown */}
          <Rect x="40" y="18" width="6" height="12" rx="2" fill="#4E342E" />

          <AnimatedG animatedProps={micProps}>
            {/* Mic Boom */}
            <Path
              stroke="#5D4037"
              strokeWidth="2"
              fill="none"
              d="M42 24 L 36 34"
              strokeLinecap="round"
            />
            <Circle cx="36" cy="34" r="2.5" fill="#3E2723" />
          </AnimatedG>

          <AnimatedG animatedProps={eyeProps}>
            {/* Eyes (Confident) - Sclera */}
            <Path
              fill="#fff"
              d="M16.8 31.2a7.2 7.2 0 1 0 0-14.4 7.2 7.2 0 0 0 0 14.4"
            />
            <Path
              fill="#fff"
              d="M31.2 31.2a7.2 7.2 0 1 0 0-14.4 7.2 7.2 0 0 0 0 14.4"
            />
            {/* Pupils - Deep brown */}
            <Circle cx="16.8" cy="24" r="2.5" fill="#4E342E" />
            <Circle cx="31.2" cy="24" r="2.5" fill="#4E342E" />
          </AnimatedG>

          {/* Mouth (Speaking) - Deep brown */}
          <Path fill="#4E342E" d="M20 34 Q 24 38, 28 34 Z" />
        </G>
      </Svg>
    </View>
  );
};
export default React.memo(OnCallFace);
