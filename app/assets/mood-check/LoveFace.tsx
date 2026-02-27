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
import Svg, { Circle, Defs, G, Mask, Path, SvgProps } from "react-native-svg";

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

const LoveFace = ({
  size = 48,
  width,
  height,
  shouldAnimate = false,
  ...props
}: SvgIconProps) => {
  const activeWidth = width || size;
  const activeHeight = height || size;
  const blink = useSharedValue(1);
  const heart = useSharedValue(1);

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
      heart.value = withRepeat(
        withSequence(
          withTiming(1.15, { duration: 600, easing: Easing.out(Easing.exp) }),
          withTiming(1, { duration: 600, easing: Easing.out(Easing.exp) }),
        ),
        -1,
        true,
      );
    } else {
      blink.value = 1;
      heart.value = 1;
    }
  }, [shouldAnimate]);

  const blinkS = useDerivedValue(() => blink.value);
  const heartS = useDerivedValue(() => heart.value);

  const blinkProps = useAnimatedProps(() => ({
    transform: [{ scaleY: blinkS.value }] as any,
    originY: 24,
  }));
  const lHeartProps = useAnimatedProps(() => ({
    transform: [{ scale: heartS.value }] as any,
    originX: 16.8,
    originY: 26,
  }));
  const rHeartProps = useAnimatedProps(() => ({
    transform: [{ scale: heartS.value }] as any,
    originX: 31.2,
    originY: 26,
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
            id="loveM"
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
        <G mask="url(#loveM)">
          <Path
            fill="#E91E63"
            d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
          />
          <Path
            fill="#F8BBD0"
            d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
          />
          <AnimatedG animatedProps={blinkProps}>
            <Circle cx="16.8" cy="24" r="7.2" fill="#FFF" />
            <Circle cx="31.2" cy="24" r="7.2" fill="#FFF" />
            <AnimatedPath
              fill="#C2185B"
              d="M16.8 22c-2.8-2-4.8 0-4.8 2s4.8 8 4.8 8s4.8-6 4.8-8s-2-2-4.8-2z"
              animatedProps={lHeartProps}
            />
            <AnimatedPath
              fill="#C2185B"
              d="M31.2 22c-2.8-2-4.8 0-4.8 2s4.8 8 4.8 8s4.8-6 4.8-8s-2-2-4.8-2z"
              animatedProps={rHeartProps}
            />
          </AnimatedG>
          <Path
            stroke="#C2185B"
            strokeWidth="3"
            strokeLinecap="round"
            d="M18 34q6 4 12 0"
            fill="none"
          />
          <Path
            fill="#F48FB1"
            d="M8 28a3 2 0 1 0 6 0 3 2 0 1 0-6 0M34 28a3 2 0 1 0 6 0 3 2 0 1 0-6 0"
          />
        </G>
      </Svg>
    </View>
  );
};
export default React.memo(LoveFace);
