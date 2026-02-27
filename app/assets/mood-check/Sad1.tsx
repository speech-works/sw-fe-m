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
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPath = Animated.createAnimatedComponent(Path);

interface SvgIconProps extends SvgProps {
  shouldAnimate?: boolean;
  loop?: boolean;
  repeatCount?: number;
  size?: number | string;
  width?: number | string;
  height?: number | string;
}

const Sad1 = ({
  size = 48,
  width,
  height,
  shouldAnimate = false,
  ...props
}: SvgIconProps) => {
  const activeWidth = width || size;
  const activeHeight = height || size;
  const blink = useSharedValue(1);
  const droop = useSharedValue(0);

  useEffect(() => {
    if (shouldAnimate) {
      blink.value = withRepeat(
        withSequence(
          withDelay(
            Math.random() * 3000 + 4000,
            withTiming(0.2, { duration: 300, easing: Easing.out(Easing.exp) }),
          ),
          withTiming(1, { duration: 300, easing: Easing.out(Easing.exp) }),
        ),
        -1,
        false,
      );
      droop.value = withRepeat(
        withSequence(
          withTiming(1.2, { duration: 1500, easing: Easing.out(Easing.exp) }),
          withTiming(0, { duration: 1500, easing: Easing.out(Easing.exp) }),
        ),
        -1,
        true,
      );
    } else {
      blink.value = 1;
      droop.value = 0;
    }
  }, [shouldAnimate]);

  const blinkS = useDerivedValue(() => blink.value);
  const drpY = useDerivedValue(() => droop.value);

  const animatedEyeProps = useAnimatedProps(() => ({
    transform: [{ scaleY: blinkS.value }],
  }));
  const animatedBrowProps = useAnimatedProps(() => ({
    transform: [{ translateY: drpY.value }],
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
            id="sad1M"
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
        <G mask="url(#sad1M)">
          <Path
            fill="#E6E8FF"
            d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
          />
          <Path
            fill="#BEEDE8"
            d="M7.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.199 2.766-33.199 0-2.767 0-2.767-38.736 0-38.736"
          />
          <AnimatedCircle
            cx="16.8"
            cy="24"
            r="7.2"
            fill="#FAFBFC"
            originY="24"
            animatedProps={animatedEyeProps}
          />
          <AnimatedCircle
            cx="31.2"
            cy="24"
            r="7.2"
            fill="#FAFBFC"
            originY="24"
            animatedProps={animatedEyeProps}
          />
          <AnimatedCircle
            cx="16.8"
            cy="24"
            r="4.32"
            fill="#5B5B5B"
            originY="24"
            animatedProps={animatedEyeProps}
          />
          <AnimatedCircle
            cx="31.2"
            cy="24"
            r="4.32"
            fill="#5B5B5B"
            originY="24"
            animatedProps={animatedEyeProps}
          />
          <AnimatedPath
            fill="#5B5B5B"
            d="M23.298 12.913 11.707 16.02l.994 3.71 11.591-3.107zM36.292 16.019l-11.591-3.106-.994 3.71 11.591 3.105z"
            animatedProps={animatedBrowProps}
          />
        </G>
      </Svg>
    </View>
  );
};
export default React.memo(Sad1);
