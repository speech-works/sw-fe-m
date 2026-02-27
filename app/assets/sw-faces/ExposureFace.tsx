import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, {
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

const ExposureFace = ({
  size = 48,
  width,
  height,
  shouldAnimate = false,
  ...props
}: SvgIconProps) => {
  const activeWidth = width || size;
  const activeHeight = height || size;
  const blink = useSharedValue(1);
  const flutter = useSharedValue(0);

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
      flutter.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1500 }),
          withTiming(0, { duration: 1500 }),
        ),
        -1,
        true,
      );
    } else {
      blink.value = 1;
      flutter.value = 0;
    }
  }, [shouldAnimate]);

  const blinkS = useDerivedValue(() => blink.value);
  const flutS = useDerivedValue(() => 1 + flutter.value * 0.05);

  const eyeProps = useAnimatedProps(() => ({
    transform: [{ scaleY: blinkS.value }] as any,
    originY: 25,
  }));
  const bgProps = useAnimatedProps(() => ({
    transform: [{ scale: flutS.value }] as any,
    originX: 24,
    originY: 24,
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
            id="expM"
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
        <G mask="url(#expM)">
          <AnimatedPath
            fill="#FFBFBF"
            d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
            animatedProps={bgProps}
          />
          <Path
            fill="#FFDABF"
            d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
          />
          <Path
            fill="#BF0000"
            d="M4 24C4 18 14 18 24 24s20-6 20 0l-2 6c-4 4-12 0-18 0s-14 4-18 0z"
          />
          <AnimatedG animatedProps={eyeProps}>
            <Circle cx="16.8" cy="25" r="2.5" fill="#FFF" />
            <Circle cx="31.2" cy="25" r="2.5" fill="#FFF" />
            <Circle cx="16.8" cy="25" r="1.5" fill="#111215" />
            <Circle cx="31.2" cy="25" r="1.5" fill="#111215" />
          </AnimatedG>
          <Path
            stroke="#111215"
            strokeWidth="2.5"
            strokeLinecap="round"
            d="M20 36q6 2 10-1"
            fill="none"
          />
        </G>
      </Svg>
    </View>
  );
};
export default React.memo(ExposureFace);
