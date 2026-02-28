import React, { useEffect } from "react";
import { Easing, View } from "react-native";
import Animated, {
    useAnimatedProps,
    useDerivedValue,
    useSharedValue,
    withDelay,
    withRepeat,
    withSequence,
    withTiming,
 cancelAnimation} from "react-native-reanimated";
import Svg, {
    Circle,
    Defs,
    G,
    Path,
    Pattern,
    SvgProps
} from "react-native-svg";

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

const WiseFace_RoadCaptain = ({
  size = 48,
  width,
  height,
  shouldAnimate = false,
  ...props
}: SvgIconProps) => {
  const activeWidth = width || size;
  const activeHeight = height || size;
  const blink = useSharedValue(1);
  const wiggle = useSharedValue(0);

  useEffect(() => {
    if (shouldAnimate) {
      blink.value = withRepeat(
        withSequence(
          withDelay(
            Math.random() * 2000 + 3000,
            withTiming(0, { duration: 120 }),
          ),
          withTiming(1, { duration: 120 }),
        ),
        -1,
        false,
      );
      wiggle.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 800, easing: Easing.out(Easing.exp) }),
          withTiming(0, { duration: 800, easing: Easing.out(Easing.exp) }),
        ),
        -1,
        true,
      );
    } else {
      blink.value = 1;
      wiggle.value = 0;
    }
  
    return () => {
      cancelAnimation(blink);
      cancelAnimation(wiggle);
    };
  }, [shouldAnimate]);

  const eyeScale = useDerivedValue(() => blink.value);
  const mustacheY = useDerivedValue(() => wiggle.value * 0.5);

  const eyeProps = useAnimatedProps(() => ({
    transform: [{ scaleY: eyeScale.value }] as any,
    originY: 28,
  }));
  const mustacheProps = useAnimatedProps(() => ({
    transform: [{ translateY: mustacheY.value }] as any,
  }));

  const bandanaPath = "M4 22c0-12 40-12 40 0-20-7-40 0-40 0z";
  const knotPath = "M43 20c4-3 6 5 0 6 3-3 4-7 0-6z";

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
          <Pattern
            id="dots"
            x="0"
            y="0"
            width="3.5"
            height="3.5"
            patternUnits="userSpaceOnUse"
          >
            <Circle cx="1.75" cy="1.75" r="0.7" fill="#212121" opacity="0.6" />
          </Pattern>
        </Defs>
        <Path
          fill="#424242"
          d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
        />
        <Path
          fill="#FFCC80"
          d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
        />
        <Path d={bandanaPath} fill="#C62828" />
        <Path d={knotPath} fill="#C62828" />
        <Path d={bandanaPath} fill="url(#dots)" />
        <Path d={knotPath} fill="url(#dots)" />
        <Path
          d="M5 21q19-7 38 0"
          stroke="#B71C1C"
          strokeWidth="1.5"
          fill="none"
        />
        <AnimatedG animatedProps={eyeProps}>
          <Circle cx="16.8" cy="28" r="1.5" fill="#212121" />
          <Circle cx="31.2" cy="28" r="1.5" fill="#212121" />
          <Path d="M13 26h7M28 26h7" stroke="#212121" strokeWidth="1" />
        </AnimatedG>
        <AnimatedPath
          d="M24 35q-6 0-10-4q-4-4 0 6q4 4 10 0q6 4 10 0q4-10 0-6q-4 4-10 0z"
          fill="#E0E0E0"
          stroke="#9E9E9E"
          strokeWidth="0.5"
          animatedProps={mustacheProps}
        />
      </Svg>
    </View>
  );
};
export default React.memo(WiseFace_RoadCaptain);
