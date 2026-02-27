import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, {
    Easing,
    useAnimatedProps,
    useDerivedValue,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming
} from "react-native-reanimated";
import Svg, {
    Circle,
    Defs,
    G,
    Line,
    LinearGradient,
    Path,
    Rect,
    Stop,
    SvgProps,
} from "react-native-svg";

const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedPath = Animated.createAnimatedComponent(Path);

interface AngryFaceProps extends SvgProps {
  size?: number | string;
  shouldAnimate?: boolean;
  loop?: boolean;
  repeatCount?: number;
}

const AngryFace = ({
  size = 48,
  width,
  height,
  shouldAnimate = false,
  ...props
}: AngryFaceProps) => {
  const activeWidth = width || size;
  const activeHeight = height || size;

  const jaw = useSharedValue(0);
  const flameS = useSharedValue(1);

  useEffect(() => {
    if (shouldAnimate) {
      jaw.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 250, easing: Easing.out(Easing.exp) }),
          withTiming(0, { duration: 250, easing: Easing.out(Easing.exp) }),
        ),
        -1,
        true,
      );
      flameS.value = withRepeat(
        withSequence(
          withTiming(1.15, { duration: 600, easing: Easing.out(Easing.exp) }),
          withTiming(0.9, { duration: 600, easing: Easing.out(Easing.exp) }),
        ),
        -1,
        true,
      );
    } else {
      jaw.value = 0;
      flameS.value = 1;
    }
  }, [shouldAnimate]);

  const upperY = useDerivedValue(() => jaw.value);
  const lowerY = useDerivedValue(() => -jaw.value);
  const fS = useDerivedValue(() => flameS.value);

  const upperProps = useAnimatedProps(() => ({
    transform: [{ translateY: upperY.value }] as any,
  }));
  const lowerProps = useAnimatedProps(() => ({
    transform: [{ translateY: lowerY.value }] as any,
  }));
  const flameProps = useAnimatedProps(() => ({
    transform: [{ scaleY: fS.value }] as any,
    originX: 24,
    originY: 48,
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
          <LinearGradient id="redG" x1="0%" y1="100%" x2="0%" y2="0%">
            <Stop offset="0%" stopColor="#8B0000" />
            <Stop offset="100%" stopColor="#DC143C" />
          </LinearGradient>
          <LinearGradient id="orangeG" x1="0%" y1="100%" x2="0%" y2="0%">
            <Stop offset="0%" stopColor="#FF4500" />
            <Stop offset="100%" stopColor="#FF8C00" />
          </LinearGradient>
          <LinearGradient id="yellowG" x1="0%" y1="100%" x2="0%" y2="0%">
            <Stop offset="0%" stopColor="#FFD700" />
            <Stop offset="100%" stopColor="#FFFF00" />
          </LinearGradient>
        </Defs>
        <Path
          fill="#4A0000"
          d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
        />
        <AnimatedPath
          d="M-5 50L-2 30Q0 25 4 15Q10 35 18 45Q24 48 30 45Q38 35 44 15Q48 25 50 30L53 50Z"
          fill="url(#redG)"
          animatedProps={flameProps}
        />
        <AnimatedPath
          d="M0 50L2 40Q5 30 8 20Q12 35 20 42Q24 45 28 42Q36 35 40 20Q43 30 46 40L48 50Z"
          fill="url(#orangeG)"
          animatedProps={flameProps}
        />
        <AnimatedPath
          d="M12 50L16 45Q20 20 24 10Q28 20 32 45L36 50Z"
          fill="url(#yellowG)"
          animatedProps={flameProps}
        />
        <Path
          fill="#F28B82"
          d="M7.628 10.176c0-2.805 33.119-2.805 33.119 0 2.76 0 2.76 39.26 0 39.26 0 2.805-33.119 2.805-33.119 0-2.76 0-2.76-39.26 0-39.26"
        />
        <Path
          fill="#4A4A4A"
          d="M24.292 16.019l-11.591-3.106-0.994 3.71 11.591 3.105zM35.298 12.913L23.707 16.02l0.994 3.71 11.591-3.107z"
        />
        <Circle cx="16.8" cy="24" r="7.2" fill="#FFF8F8" />
        <Circle cx="31.2" cy="24" r="7.2" fill="#FFF8F8" />
        <Path
          fill="#6D6D6D"
          d="M16.8 28.32a4.32 4.32 0 1 0 0-8.64 4.32 4.32 0 0 0 0 8.64M31.2 28.32a4.32 4.32 0 1 0 0-8.64 4.32 4.32 0 0 0 0 8.64"
        />
        <G transform="translate(0, 35)">
          <Rect x="13" y="-3" width="22" height="12" rx="3" fill="#300000" />
          <AnimatedG animatedProps={upperProps}>
            <Path d="M15-2H33V2.5H15Z" fill="#FFF" />
            <Line
              x1="19.5"
              y1="-2"
              x2="19.5"
              y2="2.5"
              stroke="#300000"
              strokeWidth="0.5"
            />
            <Line
              x1="24"
              y1="-2"
              x2="24"
              y2="2.5"
              stroke="#300000"
              strokeWidth="0.5"
            />
            <Line
              x1="28.5"
              y1="-2"
              x2="28.5"
              y2="2.5"
              stroke="#300000"
              strokeWidth="0.5"
            />
          </AnimatedG>
          <AnimatedG animatedProps={lowerProps}>
            <Path d="M15 3.5H33V8H15Z" fill="#FFF" />
            <Line
              x1="19.5"
              y1="3.5"
              x2="19.5"
              y2="8"
              stroke="#300000"
              strokeWidth="0.5"
            />
            <Line
              x1="24"
              y1="3.5"
              x2="24"
              y2="8"
              stroke="#300000"
              strokeWidth="0.5"
            />
            <Line
              x1="28.5"
              y1="3.5"
              x2="28.5"
              y2="8"
              stroke="#300000"
              strokeWidth="0.5"
            />
          </AnimatedG>
        </G>
      </Svg>
    </View>
  );
};

export default React.memo(AngryFace);
