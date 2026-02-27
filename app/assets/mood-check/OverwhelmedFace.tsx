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
  useDerivedValue,
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
  ...props
}: SvgIconProps) => {
  const activeWidth = width || size;
  const activeHeight = height || size;
  const blink = useSharedValue(1);
  const spin = useSharedValue(0);
  const sweat = useSharedValue(0);

  useEffect(() => {
    if (shouldAnimate) {
      blink.value = withRepeat(
        withSequence(
          withDelay(
            Math.random() * 1500 + 2000,
            withTiming(0.1, { duration: 120 }),
          ),
          withTiming(1, { duration: 120 }),
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
          withTiming(1, { duration: 1000, easing: Easing.out(Easing.exp) }),
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

  const blinkS = useDerivedValue(() => blink.value);
  const rot = useDerivedValue(() => `${spin.value}deg`);
  const iRot = useDerivedValue(() => `${-spin.value}deg`);
  const sweatY = useDerivedValue(() => sweat.value * 5);
  const sweatOp = useDerivedValue(() =>
    sweat.value === 0 ? 0 : 1 - sweat.value * 0.5,
  );

  const eyeProps = useAnimatedProps(() => ({
    transform: [{ scaleY: blinkS.value }] as any,
    originY: 24,
  }));
  const lSpin = useAnimatedProps(() => ({
    transform: [{ rotate: rot.value }] as any,
    originX: 17,
    originY: 24,
  }));
  const rSpin = useAnimatedProps(() => ({
    transform: [{ rotate: iRot.value }] as any,
    originX: 31,
    originY: 24,
  }));
  const sweatProps = useAnimatedProps(() => ({
    transform: [{ translateY: sweatY.value }] as any,
    opacity: sweatOp.value,
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
        <Path
          fill="#FF7043"
          d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
        />
        <Path
          fill="#FFCCBC"
          d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
        />
        <AnimatedG animatedProps={eyeProps}>
          <Circle cx="16.8" cy="24.2" r="7.2" fill="#FFF" />
          <Circle cx="31.2" cy="24.2" r="7.2" fill="#FFF" />
          <AnimatedG animatedProps={lSpin}>
            <Path
              stroke="#BF360C"
              strokeWidth="2.5"
              strokeLinecap="round"
              d="M13.5 20.5l7 7M20.5 20.5l-7 7"
            />
          </AnimatedG>
          <AnimatedG animatedProps={rSpin}>
            <Path
              stroke="#BF360C"
              strokeWidth="2.5"
              strokeLinecap="round"
              d="M27.5 20.5l7 7M34.5 20.5l-7 7"
            />
          </AnimatedG>
        </AnimatedG>
        <Path
          stroke="#BF360C"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
          d="M17 35q2-2 4 0q2 2 4 0q2-2 4 0"
        />
        <AnimatedPath
          fill="#42A5F5"
          d="M38 10c0 0-3 5 0 7c3-2 2-7 2-7z"
          animatedProps={sweatProps}
        />
      </Svg>
    </View>
  );
};
export default React.memo(OverwhelmedFace);
