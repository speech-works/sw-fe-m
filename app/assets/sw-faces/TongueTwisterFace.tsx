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
 cancelAnimation} from "react-native-reanimated";
import Svg, {
    Circle,
    G,
    Line,
    Path,
    SvgProps
} from "react-native-svg";

const AnimatedG = Animated.createAnimatedComponent(G);

interface SvgIconProps extends SvgProps {
  shouldAnimate?: boolean;
  loop?: boolean;
  repeatCount?: number;
  size?: number | string;
  width?: number | string;
  height?: number | string;
  transparentBg?: boolean;
}

const TongueTwisterFace = ({
  size = 48,
  width,
  height,
  shouldAnimate = false,
  transparentBg = false,
  ...props
}: SvgIconProps) => {
  const activeWidth = width || size;
  const activeHeight = height || size;
  const blink = useSharedValue(1);
  const vibration = useSharedValue(0);

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
      vibration.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 50 }),
          withTiming(-1, { duration: 50 }),
          withTiming(0, { duration: 50 }),
          withDelay(1000, withTiming(0, { duration: 0 })),
        ),
        -1,
        false,
      );
    } else {
      blink.value = 1;
      vibration.value = 0;
    }
  
    return () => {
      cancelAnimation(blink);
      cancelAnimation(vibration);
    };
  }, [shouldAnimate]);

  const blinkS = useDerivedValue(() => blink.value);
  const stitchX = useDerivedValue(() => vibration.value * 0.5);

  const eyeProps = useAnimatedProps(() => ({
    transform: [{ scaleY: blinkS.value }] as any,
    originY: 24,
  }));
  const stitchProps = useAnimatedProps(() => ({
    transform: [{ translateX: stitchX.value }] as any,
  }));

  return (
    <View
      style={{
        width: activeWidth as any,
        height: activeHeight as any,
        borderRadius: (Number(activeWidth) || 48) / 2,
        overflow: "hidden",
        backgroundColor: transparentBg ? "transparent" : undefined,
      }}
    >
      <Svg
        width={activeWidth}
        height={activeHeight}
        viewBox="0 0 48 48"
        fill="none"
        {...props}
      >
        {!transparentBg && (
          <Path
            fill="#6A1B9A"
            d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
          />
        )}
        <Path
          fill="#FFCCBC"
          d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
        />
        <AnimatedG animatedProps={eyeProps}>
          <Circle cx="17" cy="24" r="3" fill="#212121" />
          <Circle cx="31" cy="24" r="3" fill="#212121" />
          <Circle cx="18" cy="23" r="1" fill="#FFF" opacity="0.8" />
          <Circle cx="32" cy="23" r="1" fill="#FFF" opacity="0.8" />
        </AnimatedG>
        <Path
          d="M16 17.5l4 1.5M28 19l4-1.5"
          stroke="#212121"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <AnimatedG
          stroke="#FFF"
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
          animatedProps={stitchProps}
        >
          <Line x1="19" y1="34" x2="29" y2="34" strokeWidth={1} />
          <Line x1="22" y1="32.5" x2="22" y2="35.5" strokeWidth="1.5" />
          <Line x1="26" y1="32.5" x2="26" y2="35.5" strokeWidth="1.5" />
        </AnimatedG>
      </Svg>
    </View>
  );
};
export default React.memo(TongueTwisterFace);
