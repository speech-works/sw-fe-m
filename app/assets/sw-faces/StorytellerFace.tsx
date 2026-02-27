import React, { useEffect } from "react";
import { View } from "react-native";
import Svg, { Circle, G, Path, SvgProps } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
  cancelAnimation,
  useDerivedValue,
} from "react-native-reanimated";

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

const StorytellerFace = ({
  size = 48,
  width,
  height,
  shouldAnimate,
  loop,
  repeatCount,
  ...props
}: SvgIconProps) => {
  const activeWidth = width || size;
  const activeHeight = height || size;

  const scrollY = useSharedValue(0);
  const blink = useSharedValue(1);

  React.useEffect(() => {
    if (!shouldAnimate) {
      scrollY.value = 0;
      blink.value = 1;
      return;
    }

    // Snappier scrolling - linear is fine for continuous motion, but native thread is key
    scrollY.value = withRepeat(
      withTiming(-12, { duration: 4000, easing: Easing.linear }),
      -1,
      false,
    );

    // High-velocity blink
    blink.value = withRepeat(
      withSequence(
        withDelay(
          3000,
          withTiming(0, { duration: 100, easing: Easing.out(Easing.exp) }),
        ),
        withTiming(1, { duration: 100, easing: Easing.out(Easing.exp) }),
      ),
      -1,
      false,
    );
  }, [shouldAnimate]);

  const offset = useDerivedValue(() => scrollY.value);
  const eyeScale = useDerivedValue(() => blink.value);

  const scrollProps = useAnimatedProps(() => ({
    transform: [{ translateY: offset.value }] as any,
  }));

  const eyeProps = useAnimatedProps(() => ({
    transform: [
      { translateY: 24 },
      { scaleY: eyeScale.value },
      { translateY: -24 },
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
        <Path
          fill="#80CBC4"
          d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24C37.255 48 48 37.255 48 24z"
        />
        <Path
          fill="black"
          opacity={0.25}
          transform="translate(1, 1)"
          d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
        />
        <Path
          fill="#FFCCBC"
          d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
        />
        <G stroke="#BF360C" strokeWidth="4" fill="none" strokeLinecap="round">
          <Circle cx="16.8" cy="24" r="8" />
          <Circle cx="31.2" cy="24" r="8" />
          <Path d="M24.8 24 H 23.2" />
        </G>
        <AnimatedG animatedProps={eyeProps}>
          <Circle cx="16.8" cy="24" r="2.5" fill="#BF360C" />
          <Circle cx="31.2" cy="24" r="2.5" fill="#BF360C" />
          <Circle cx="17.5" cy="23" r="0.7" fill="#FFF" opacity="0.8" />
          <Circle cx="31.9" cy="23" r="0.7" fill="#FFF" opacity="0.8" />
        </AnimatedG>
        <G transform="translate(24, 38)">
          <Path
            d="M-12-6h24v10h-12l-2 3-2-3h-8z"
            fill="#FFF"
            stroke="#BF360C"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <AnimatedG animatedProps={scrollProps}>
            <Path
              stroke="#BF360C"
              strokeWidth="1"
              strokeLinecap="round"
              d="M-8 0h16M-6 3h12M-9 6h12M-5 9h10"
            />
            <Path
              stroke="#BF360C"
              strokeWidth="1"
              strokeLinecap="round"
              d="M-8 12h16M-6 15h12M-9 18h12M-5 21h10"
            />
          </AnimatedG>
        </G>
      </Svg>
    </View>
  );
};
export default React.memo(StorytellerFace);
