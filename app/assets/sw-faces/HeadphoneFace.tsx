import Animated, {
    Easing,
    useAnimatedProps,
    useDerivedValue,
    useSharedValue,
    withDelay,
    withRepeat,
    withSequence,
    withTiming,
 cancelAnimation} from "react-native-reanimated";

import React, { useEffect } from "react";
import { View } from "react-native";
import Svg, {
    Circle,
    Defs,
    G,
    Mask,
    Path,
    Rect,
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
  transparentBg?: boolean;
}

const HeadphoneFace = ({
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
  const float = useSharedValue(0);

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
      float.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true,
      );
    } else {
      blink.value = 1;
      float.value = 0;
    }
  
    return () => {
      cancelAnimation(blink);
      cancelAnimation(float);
    };
  }, [shouldAnimate]);

  const blinkS = useDerivedValue(() => blink.value);
  const fltY = useDerivedValue(() => float.value * -2);
  const fltRot = useDerivedValue(() => `${10 + float.value * 2}deg`);

  const eyeProps = useAnimatedProps(() => ({
    transform: [{ scaleY: blinkS.value }] as any,
    originY: 28,
  }));
  const thumbProps = useAnimatedProps(() => ({
    transform: [
      { translateX: 24 },
      { translateY: 16 + fltY.value },
      { rotate: fltRot.value },
      { translateX: -24 },
      { translateY: -16 },
    ] as any,
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
          <Mask id="headM">
            <Circle cx="24" cy="24" r="24" fill="#fff" />
          </Mask>
        </Defs>
        <G mask="url(#headM)">
          {!transparentBg && <Circle cx="24" cy="24" r="24" fill="#AD1457" />}
          <AnimatedG animatedProps={thumbProps}>
            <Rect
              x="6"
              y="6"
              width="36"
              height="20"
              rx="4"
              fill="#EC407A"
              opacity={0.5}
              transform="translate(0, -8) scale(0.9)"
            />
            <Rect
              x="6"
              y="6"
              width="36"
              height="20"
              rx="4"
              fill="#F48FB1"
              opacity={0.7}
              transform="translate(0, -4) scale(0.95)"
            />
            <Rect x="6" y="6" width="36" height="20" rx="4" fill="#F8BBD0" />
            <Path d="M20 12l10 4l-10 4z" fill="#AD1457" />
          </AnimatedG>
          <G transform="translate(0, 10)">
            <Path
              fill="#FFECB3"
              d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
            />
            <Path
              d="M7 20q17-12 34 0"
              stroke="#F8BBD0"
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
            />
            <Circle cx="7" cy="24" r="5" fill="#D81B60" />
            <Circle cx="41" cy="24" r="5" fill="#D81B60" />
            <AnimatedG animatedProps={eyeProps}>
              <Path
                d="M14 28q4-2 8 0M26 28q4-2 8 0"
                stroke="#3E2723"
                strokeWidth="2.5"
                strokeLinecap="round"
                fill="none"
              />
            </AnimatedG>
            <Path
              d="M20 35q4 3 8 0"
              stroke="#3E2723"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
            />
          </G>
        </G>
      </Svg>
    </View>
  );
};
export default React.memo(HeadphoneFace);
