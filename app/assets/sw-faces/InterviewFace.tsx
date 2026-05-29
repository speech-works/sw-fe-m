import React, { useEffect } from "react";
import Animated, {
    useAnimatedProps,
    useDerivedValue,
    useSharedValue,
    withDelay,
    withRepeat,
    withSequence,
    withTiming,
    Easing,
 cancelAnimation} from "react-native-reanimated";

import { View } from "react-native";
import Svg, { Circle, Defs, G, Mask, Path, SvgProps } from "react-native-svg";

const AnimatedG = Animated.createAnimatedComponent(G);
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

const InterviewFace = ({
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
  const wiggle = useSharedValue(0);

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
      wiggle.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1500, easing: Easing.out(Easing.exp) }),
          withTiming(0, { duration: 1500, easing: Easing.out(Easing.exp) }),
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

  const blinkS = useDerivedValue(() => blink.value);
  const wigRot = useDerivedValue(() => `${wiggle.value}deg`);

  const eyeProps = useAnimatedProps(() => ({
    transform: [{ scaleY: blinkS.value }] as any,
    originY: 24,
  }));
  const tieProps = useAnimatedProps(() => ({
    transform: [{ rotate: wigRot.value }] as any,
    originX: 24,
    originY: 38,
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
            id="intM"
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
        <G mask="url(#intM)">
          {!transparentBg && (
            <Path
              fill="#E3F2FD"
              d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
            />
          )}
          <Path
            fill="#FFDABF"
            d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
          />
          <Path d="M8 42l16 2V38zM40 42l-16 2V38z" fill="#FFF" />
          <AnimatedPath
            d="M24 38l4 3l-1 7H21l-1-7z"
            fill="#880E4F"
            animatedProps={tieProps}
          />
          <Circle
            cx="16.8"
            cy="24"
            r="5.5"
            stroke="#757575"
            strokeWidth="1.5"
            fill="#FFDABF"
            fillOpacity="0.5"
          />
          <Circle
            cx="31.2"
            cy="24"
            r="5.5"
            stroke="#757575"
            strokeWidth="1.5"
            fill="#FFDABF"
            fillOpacity="0.5"
          />
          <Path d="M22.3 24h3.4" stroke="#757575" strokeWidth="1.5" />
          <Path
            d="M13 26q-2 1 0 2M35 26q2 1 0 2"
            stroke="#D7CCC8"
            strokeWidth="1"
            fill="none"
          />
          <AnimatedG animatedProps={eyeProps}>
            <Circle cx="16.8" cy="24" r="1.5" fill="#263238" />
            <Circle cx="31.2" cy="24" r="1.5" fill="#263238" />
          </AnimatedG>
          <Path
            stroke="#8D6E63"
            strokeWidth="1.5"
            strokeLinecap="round"
            d="M20 34q4 1 8 0"
            fill="none"
          />
        </G>
      </Svg>
    </View>
  );
};
export default React.memo(InterviewFace);
