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

const OverwhelmedFace = ({
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
  const spin = useSharedValue(0);
  const sweat = useSharedValue(0);

  React.useEffect(() => {
    if (shouldAnimate) {
      blink.value = withRepeat(
        withSequence(
          withDelay(
            Math.random() * 1500 + 2000,
            withTiming(0.1, { duration: 150 }),
          ),
          withTiming(1, { duration: 150 }),
        ),
        -1,
        false,
      );
      spin.value = withRepeat(
        withTiming(360, { duration: 3000, easing: Easing.linear }),
        -1,
        false,
      );
      sweat.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1000, easing: Easing.in(Easing.quad) }),
          withTiming(0, { duration: 0 }),
          withDelay(2000, withTiming(0, { duration: 0 })),
        ),
        -1,
        false,
      );
    } else {
      blink.value = 1;
      spin.value = 0;
      sweat.value = 0;
    }
  }, [shouldAnimate]);

  const eyeProps = useAnimatedProps(() => ({
    transform: [{ scaleY: blink.value }] as any,
    originY: 24,
  }));

  const spinLeftProps = useAnimatedProps(() => ({
    transform: [{ rotate: `${spin.value}deg` }] as any,
    originX: 17,
    originY: 24,
  }));

  const spinRightProps = useAnimatedProps(() => ({
    transform: [{ rotate: `${-spin.value}deg` }] as any,
    originX: 31,
    originY: 24,
  }));

  const sweatProps = useAnimatedProps(() => ({
    transform: [{ translateY: sweat.value * 5 }] as any,
    opacity: sweat.value === 0 ? 0 : 1 - sweat.value * 0.5,
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
            id="overwhelmed_mask"
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
        <G mask="url(#overwhelmed_mask)">
          {/* Background - Intense Orange */}
          <Path
            fill="#FF7043"
            d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
          />
          <G>
            {/* Face Shape - Pale Orange/Peach */}
            <Path
              fill="#FFCCBC"
              d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
            />
          </G>

          <AnimatedG animatedProps={eyeProps}>
            {/* Eyes (White) */}
            <Path
              fill="#fff"
              d="M16.8 31.2a7.2 7.2 0 1 0 0-14.4 7.2 7.2 0 0 0 0 14.4"
            />
            <Path
              fill="#fff"
              d="M31.2 31.2a7.2 7.2 0 1 0 0-14.4 7.2 7.2 0 0 0 0 14.4"
            />
            {/* Pupils (X marks for dizzy/overwhelmed) */}
            <AnimatedG animatedProps={spinLeftProps}>
              <Path
                stroke="#BF360C"
                strokeWidth="2.5"
                strokeLinecap="round"
                d="M13.5 20.5 L 20.5 27.5 M20.5 20.5 L 13.5 27.5"
              />
            </AnimatedG>
            <AnimatedG animatedProps={spinRightProps}>
              <Path
                stroke="#BF360C"
                strokeWidth="2.5"
                strokeLinecap="round"
                d="M27.5 20.5 L 34.5 27.5 M34.5 20.5 L 27.5 27.5"
              />
            </AnimatedG>
          </AnimatedG>

          {/* Distressed Wavy Mouth */}
          <Path
            stroke="#BF360C"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
            d="M17 35 Q 19 33, 21 35 Q 23 37, 25 35 Q 27 33, 29 35"
          />
          {/* Sweat drop */}
          <AnimatedPath
            fill="#42A5F5"
            d="M38 10 C 38 10, 35 15, 38 17 C 41 15, 40 10, 40 10 Z"
            animatedProps={sweatProps}
          />
        </G>
      </Svg>
    </View>
  );
};

export default React.memo(OverwhelmedFace);
