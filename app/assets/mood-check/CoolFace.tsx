import React, { useEffect } from "react";
import { View } from "react-native";
import Svg, { Defs, G, Mask, Path, SvgProps } from "react-native-svg";
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

const CoolFace = ({
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
  const smirk = useSharedValue(0);

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
      smirk.value = withRepeat(
        withSequence(
          withTiming(1.5, { duration: 800, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 800, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        true,
      );
    } else {
      blink.value = 1;
      smirk.value = 0;
    }
  }, [shouldAnimate]);

  const blinkProps = useAnimatedProps(() => ({
    transform: [{ scaleY: blink.value }] as any,
    originY: 24,
  }));

  const smirkProps = useAnimatedProps(() => ({
    transform: [{ translateX: smirk.value }] as any,
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
            id="cool_mask"
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
        <G mask="url(#cool_mask)">
          {/* Background - Fresh Mint/Cyan */}
          <Path
            fill="#26C6DA"
            d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
          />
          <G>
            {/* Face Shape - Very light cyan */}
            <Path
              fill="#E0F7FA"
              d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
            />
          </G>

          <AnimatedG animatedProps={blinkProps}>
            {/* Sunglasses */}
            <Path
              fill="#37474F"
              d="M8 20 C 8 20, 10 28, 17 28 C 22 28, 22 20, 22 20 L 8 20 Z"
            />
            <Path
              fill="#37474F"
              d="M26 20 C 26 20, 28 28, 35 28 C 40 28, 40 20, 40 20 L 26 20 Z"
            />
            <Path stroke="#37474F" strokeWidth="2" d="M22 22 L 26 22" />

            {/* Reflection on glasses */}
            <Path fill="#546E7A" d="M10 21 L 15 21 L 10 25 Z" opacity="0.5" />
            <Path fill="#546E7A" d="M28 21 L 33 21 L 28 25 Z" opacity="0.5" />
          </AnimatedG>

          {/* Confident Smirk */}
          <AnimatedPath
            stroke="#37474F"
            strokeWidth="2.5"
            strokeLinecap="round"
            d="M20 34 Q 26 36, 30 33"
            fill="none"
            animatedProps={smirkProps}
          />
        </G>
      </Svg>
    </View>
  );
};

export default React.memo(CoolFace);
