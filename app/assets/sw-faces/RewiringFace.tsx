import React, { useEffect } from "react";
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

import { View } from "react-native";
import Svg, { Circle, Defs, G, Mask, Path, SvgProps } from "react-native-svg";

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface SvgIconProps extends SvgProps {
  size?: number | string;
  width?: number | string;
  height?: number | string;
  shouldAnimate?: boolean;
  loop?: boolean;
  repeatCount?: number;
  transparentBg?: boolean;
}

const RewiringFace = ({
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
  const rotation = useSharedValue(0);

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
      rotation.value = withRepeat(
        withTiming(360, { duration: 3000, easing: Easing.linear }),
        -1,
        false,
      );
    } else {
      blink.value = 1;
      rotation.value = 0;
    }
  
    return () => {
      cancelAnimation(blink);
      cancelAnimation(rotation);
    };
  }, [shouldAnimate]);

  const blinkS = useDerivedValue(() => blink.value);
  const rotDeg = useDerivedValue(() => `${rotation.value}deg`);

  // eyeProps now only contains the transform, originY is handled per circle
  const eyeTransformProps = useAnimatedProps(() => ({
    transform: [{ scaleY: blinkS.value }] as any,
  }));

  const spiralProps = useAnimatedProps(() => ({
    transform: [{ rotate: rotDeg.value }] as any,
    originX: 24,
    originY: 10,
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
            id="rewM"
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
        <G mask="url(#rewM)">
          {!transparentBg && (
            <Path
              fill="#C62828"
              d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
            />
          )}
          <Path
            fill="#F5F5F5"
            d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
          />
          {/* Flat SVG structure for eyes: animate each circle directly */}
          <AnimatedCircle
            cx="17"
            cy="24"
            r="3"
            fill="#212121"
            animatedProps={eyeTransformProps}
            originY={24}
          />
          <AnimatedCircle
            cx="31"
            cy="24"
            r="3"
            fill="#212121"
            animatedProps={eyeTransformProps}
            originY={24}
          />
          <AnimatedCircle
            cx="18.2"
            cy="22.8"
            r="0.8"
            fill="#FFF"
            animatedProps={eyeTransformProps}
            originY={22.8}
          />
          <AnimatedCircle
            cx="32.2"
            cy="22.8"
            r="0.8"
            fill="#FFF"
            animatedProps={eyeTransformProps}
            originY={22.8}
          />
          <Path
            stroke="#424242"
            strokeWidth="3"
            strokeLinecap="round"
            d="M18 32q6 5 12 0"
            fill="none"
          />
          <AnimatedPath
            stroke="#D32F2F"
            strokeWidth="2.5"
            fill="none"
            d="M24 10a10 10 0 1 1 0 .1M24 15a5 5 0 1 1 0 .1"
            animatedProps={spiralProps}
          />
        </G>
      </Svg>
    </View>
  );
};
export default React.memo(RewiringFace);
