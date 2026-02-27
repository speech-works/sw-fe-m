import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, {
    Easing,
    useAnimatedProps,
    useDerivedValue,
    useSharedValue,
    withDelay,
    withRepeat,
    withSequence,
    withTiming,
} from "react-native-reanimated";
import Svg, { Circle, G, Path, SvgProps } from "react-native-svg";

const AnimatedG = Animated.createAnimatedComponent(G);

interface SvgIconProps extends SvgProps {
  shouldAnimate?: boolean;
  loop?: boolean;
  repeatCount?: number;
  size?: number | string;
}

const HappyFace = ({
  size = 48,
  width,
  height,
  shouldAnimate = false,
  ...props
}: SvgIconProps) => {
  const activeWidth = width || size;
  const activeHeight = height || size;
  const blink = useSharedValue(1);
  const bounce = useSharedValue(0);
  const wiggle = useSharedValue(0);
  const twinkle = useSharedValue(0);

  useEffect(() => {
    if (shouldAnimate) {
      blink.value = withRepeat(
        withSequence(
          withDelay(
            Math.random() * 2000 + 3000,
            withTiming(0.1, { duration: 120 }),
          ),
          withTiming(1, { duration: 120 }),
        ),
        -1,
        false,
      );
      bounce.value = withRepeat(
        withSequence(
          withTiming(-6, { duration: 300, easing: Easing.out(Easing.exp) }),
          withTiming(0, { duration: 300, easing: Easing.out(Easing.exp) }),
        ),
        -1,
        true,
      );
      wiggle.value = withRepeat(
        withSequence(
          withTiming(-3, { duration: 600, easing: Easing.out(Easing.exp) }),
          withTiming(3, { duration: 600, easing: Easing.out(Easing.exp) }),
        ),
        -1,
        true,
      );
      twinkle.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 500, easing: Easing.out(Easing.exp) }),
          withTiming(0.5, { duration: 500, easing: Easing.out(Easing.exp) }),
        ),
        -1,
        true,
      );
    } else {
      blink.value = 1;
      bounce.value = 0;
      wiggle.value = 0;
      twinkle.value = 0;
    }
  }, [shouldAnimate]);

  const eyeScale = useDerivedValue(() => blink.value);
  const faceY = useDerivedValue(() => bounce.value);
  const faceRot = useDerivedValue(() => `${wiggle.value}deg`);
  const starOp = useDerivedValue(() => 0.5 + 0.5 * twinkle.value);
  const starS = useDerivedValue(() => 0.8 + 0.4 * twinkle.value);

  const eyeProps = useAnimatedProps(() => ({
    transform: [
      { translateY: 24 },
      { scaleY: eyeScale.value },
      { translateY: -24 },
    ] as any,
  }));
  const faceProps = useAnimatedProps(() => ({
    transform: [{ translateY: faceY.value }, { rotate: faceRot.value }] as any,
    originX: 24,
    originY: 24,
  }));
  const starProps = useAnimatedProps(() => ({
    opacity: starOp.value,
    transform: [{ scale: starS.value }] as any,
    originX: 24,
    originY: 40,
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
          fill="#F9E7D9"
          d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
        />
        <AnimatedG animatedProps={faceProps}>
          <Path
            fill="#F7DFA9"
            d="M7.538 10.313c0-2.766 33.199-2.766 33.199 0 2.766 0 2.766 60 0 60 0 2.767-33.2 2.767-33.2 0-2.766 0-2.766-60 0-60"
          />
          <AnimatedG animatedProps={eyeProps}>
            <Circle cx="16.8" cy="24" r="7.2" fill="#FFF" />
            <Circle cx="31.2" cy="24" r="7.2" fill="#FFF" />
            <Path
              fill="#2E2E2E"
              d="M16.8 28.32a4.32 4.32 0 1 0 0-8.64 4.32 4.32 0 0 0 0 8.64M31.2 28.32a4.32 4.32 0 1 0 0-8.64 4.32 4.32 0 0 0 0 8.64"
            />
          </AnimatedG>
          <Path fill="#5C4033" d="M15 36q9 1 18 0q0 8-9 8t-9-8z" />
          <Path fill="#FFF" d="M15 36q9 1 18 0l-0.5 3q-8.5 1-17 0z" />
          <Path
            stroke="#3E2723"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            d="M15 36q9 1 18 0q0 8-9 8t-9-8z"
          />
        </AnimatedG>
        <AnimatedG animatedProps={starProps}>
          <Path
            fill="#FFD700"
            d="M12 40l1 2l2 0l-1.5 1.5l0.5 2l-2-1.5l-2 1.5l0.5-2l-1.5-1.5l2 0zM36 40l1 2l2 0l-1.5 1.5l0.5 2l-2-1.5l-2 1.5l0.5-2l-1.5-1.5l2 0z"
          />
          <Path
            fill="#FFFACD"
            d="M24 42l0.5 1l1 0l-0.7 0.8l0.2 1l-1-0.8l-1 0.8l0.2-1l-0.7-0.8l1 0z"
          />
        </AnimatedG>
      </Svg>
    </View>
  );
};
export default React.memo(HappyFace);
