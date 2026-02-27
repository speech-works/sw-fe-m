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
const AnimatedPath = Animated.createAnimatedComponent(Path);

interface SvgIconProps extends SvgProps {
  size?: number | string;
  width?: number | string;
  height?: number | string;
  shouldAnimate?: boolean;
  loop?: boolean;
  repeatCount?: number;
}

const AgentFace = ({
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

  const glint = useSharedValue(0);
  const wire = useSharedValue(0);

  React.useEffect(() => {
    if (shouldAnimate) {
      glint.value = withRepeat(
        withSequence(
          withDelay(
            Math.random() * 2000 + 3000,
            withTiming(1, { duration: 400 }),
          ),
          withTiming(0, { duration: 0 }),
        ),
        -1,
        false,
      );
      wire.value = withRepeat(
        withSequence(
          withTiming(1.05, {
            duration: 1000,
            easing: Easing.inOut(Easing.sin),
          }),
          withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true,
      );
    } else {
      glint.value = 0;
      wire.value = 1;
    }
  }, [shouldAnimate]);

  const glintProps = useAnimatedProps(() => ({
    opacity: glint.value,
    transform: [{ translateX: glint.value * 10 - 5 }] as any,
  }));

  const wireProps = useAnimatedProps(() => ({
    transform: [{ scaleY: wire.value }] as any,
    originY: 26,
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
            id="agent_mask"
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

        <G mask="url(#agent_mask)">
          {/* Background - Midnight Blue (Stealth) */}
          <Path
            fill="#263238"
            d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
          />

          {/* The Brand Face Shape */}
          <G>
            <Path
              fill="#FFCCBC"
              d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
            />
          </G>

          {/* Sunglasses (Blacked out) */}
          <G>
            <Path fill="#000" d="M10 24 L 20 24 L 20 30 L 12 30 Z" />
            <Path fill="#000" d="M28 24 L 38 24 L 36 30 L 28 30 Z" />
            <Path stroke="#000" strokeWidth="2" d="M20 25 L 28 25" />
            {/* Subtle Glint */}
            <AnimatedPath
              d="M12 24 L 16 24 L 14 30 L 10 30 Z"
              fill="#fff"
              animatedProps={glintProps}
            />
          </G>

          {/* Neutral Mouth */}
          <Path
            stroke="#000"
            strokeWidth="2"
            strokeLinecap="round"
            d="M22 36 L 26 36"
          />

          {/* Fedora Hat */}
          <Path fill="#37474F" d="M14 -4 L 34 -4 L 36 8 L 12 8 Z" />
          <Path fill="#000" d="M12 4 L 36 4 L 36 8 L 12 8 Z" />
          <Path
            stroke="#37474F"
            strokeWidth="4"
            strokeLinecap="round"
            d="M4 8 Q 24 12, 44 8"
            fill="none"
          />

          {/* Secret Service Earpiece */}
          <AnimatedPath
            stroke="#90A4AE"
            strokeWidth="1.5"
            strokeLinecap="round"
            fill="none"
            d="M39 26 C 42 26, 44 30, 42 36 C 40 42, 44 44, 44 50"
            opacity="0.8"
            animatedProps={wireProps}
          />
          <Circle cx="39" cy="26" r="1.5" fill="#90A4AE" />
        </G>
      </Svg>
    </View>
  );
};

export default React.memo(AgentFace);
