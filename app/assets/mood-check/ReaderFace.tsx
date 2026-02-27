import React, { useEffect } from "react";
import { View } from "react-native";
import Svg, { Circle, G, Path, SvgProps } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  useDerivedValue,
} from "react-native-reanimated";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPath = Animated.createAnimatedComponent(Path);

interface SvgIconProps extends SvgProps {
  size?: number | string;
  width?: number | string;
  height?: number | string;
  shouldAnimate?: boolean;
  loop?: boolean;
  repeatCount?: number;
  transparentBg?: boolean;
}

const ReaderFace = ({
  size = 48,
  width,
  height,
  shouldAnimate = false,
  ...props
}: SvgIconProps) => {
  const activeWidth = width || size;
  const activeHeight = height || size;
  const progress = useSharedValue(0);

  useEffect(() => {
    if (shouldAnimate) {
      progress.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 600, easing: Easing.out(Easing.exp) }),
          withTiming(0, { duration: 600, easing: Easing.out(Easing.exp) }),
        ),
        -1,
        false,
      );
    } else {
      progress.value = 0;
    }
  }, [shouldAnimate]);

  const lpX = useDerivedValue(() => 16.8 + progress.value * 2);
  const rpX = useDerivedValue(() => 31.2 + progress.value * 2);
  const tX = useDerivedValue(() => progress.value * 3);

  const lpProps = useAnimatedProps(() => ({ cx: lpX.value }));
  const rpProps = useAnimatedProps(() => ({ cx: rpX.value }));
  const textProps = useAnimatedProps(() => ({
    transform: [{ translateX: tX.value }] as any,
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
          fill="#66BB6A"
          d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
        />
        <Path
          fill="#FFCCBC"
          d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
        />
        <Circle cx="16.8" cy="24" r="7.2" fill="#FFF" />
        <Circle cx="31.2" cy="24" r="7.2" fill="#FFF" />
        <AnimatedCircle
          animatedProps={lpProps}
          cy="26"
          r="2.5"
          fill="#BF360C"
        />
        <AnimatedCircle
          animatedProps={rpProps}
          cy="26"
          r="2.5"
          fill="#BF360C"
        />
        <G stroke="#1B5E20" strokeWidth="4" fill="none" strokeLinecap="round">
          <Circle cx="16.8" cy="24" r="8" />
          <Circle cx="31.2" cy="24" r="8" />
          <Path d="M24.8 24h-1.6M8.8 24H4M39.2 24H44" />
        </G>
        <Path fill="#FFF" d="M14 36h20l-2 12H16z" />
        <AnimatedPath
          stroke="#1B5E20"
          strokeWidth="1.5"
          strokeLinecap="round"
          d="M18 40h12"
          animatedProps={textProps}
        />
        <AnimatedPath
          stroke="#1B5E20"
          strokeWidth="1.5"
          strokeLinecap="round"
          d="M18 44h10"
          animatedProps={textProps}
        />
        <Circle cx="32" cy="42" r="3" fill="#FFAB91" />
      </Svg>
    </View>
  );
};
export default React.memo(ReaderFace);
