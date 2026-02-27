import React, { useEffect } from "react";
import Animated, {
    useAnimatedProps,
    useDerivedValue,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming
} from "react-native-reanimated";

import { Easing, View } from "react-native";
import Svg, {
    Circle,
    Defs,
    G,
    Line,
    Mask,
    Path,
    SvgProps,
} from "react-native-svg";

const AnimatedG = Animated.createAnimatedComponent(G);

interface SvgIconProps extends SvgProps {
  size?: number | string;
  width?: number | string;
  height?: number | string;
  shouldAnimate?: boolean;
  loop?: boolean;
  repeatCount?: number;
}

const MaskedFace = ({
  size = 48,
  width,
  height,
  shouldAnimate = false,
  ...props
}: SvgIconProps) => {
  const activeWidth = width || size;
  const activeHeight = height || size;
  const breath = useSharedValue(0);
  const wiggle = useSharedValue(0);

  useEffect(() => {
    if (shouldAnimate) {
      breath.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true,
      );
      wiggle.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1000, easing: Easing.out(Easing.exp) }),
          withTiming(0, { duration: 1000, easing: Easing.out(Easing.exp) }),
        ),
        -1,
        true,
      );
    } else {
      breath.value = 0;
      wiggle.value = 0;
    }
  }, [shouldAnimate]);

  const fltSc = useDerivedValue(() => 1 + breath.value * 0.05);
  const wigY = useDerivedValue(() => wiggle.value * -1);

  const filterProps = useAnimatedProps(() => ({
    transform: [{ scale: fltSc.value }] as any,
    originX: 24,
    originY: 32,
  }));
  const eyebProps = useAnimatedProps(() => ({
    transform: [{ translateY: wigY.value }] as any,
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
            id="maskM"
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
        <G mask="url(#maskM)">
          <Path
            fill="#795548"
            d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
          />
          <Path
            fill="#FFCCBC"
            d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
          />
          <AnimatedG animatedProps={eyebProps}>
            <Line
              x1="16"
              y1="19.5"
              x2="20"
              y2="20.5"
              stroke="#000"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <Line
              x1="28"
              y1="20.5"
              x2="32"
              y2="19.5"
              stroke="#000"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </AnimatedG>
          <Path fill="#6D4C41" opacity="0.5" d="M8 10q0-2 32 0v30q0 2-32 0z" />
          <Circle
            cx="17"
            cy="20"
            r="5"
            fill="#BCAAA4"
            stroke="#8D6E63"
            strokeWidth="1.5"
          />
          <Circle
            cx="31"
            cy="20"
            r="5"
            fill="#BCAAA4"
            stroke="#8D6E63"
            strokeWidth="1.5"
          />
          <Circle cx="17" cy="20" r="3.5" fill="#424242" opacity="0.8" />
          <Circle cx="31" cy="20" r="3.5" fill="#424242" opacity="0.8" />
          <AnimatedG animatedProps={filterProps}>
            <Circle
              cx="24"
              cy="32"
              r="8"
              fill="#BCAAA4"
              stroke="#8D6E63"
              strokeWidth="2"
            />
            <Line
              x1="24"
              y1="24"
              x2="24"
              y2="40"
              stroke="#8D6E63"
              strokeWidth="1"
            />
            <Line
              x1="16"
              y1="32"
              x2="32"
              y2="32"
              stroke="#8D6E63"
              strokeWidth="1"
            />
          </AnimatedG>
          <Circle cx="12" cy="15" r="1" fill="#757575" />
          <Circle cx="36" cy="15" r="1" fill="#757575" />
        </G>
      </Svg>
    </View>
  );
};
export default React.memo(MaskedFace);
