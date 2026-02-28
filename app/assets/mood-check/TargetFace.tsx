import React, { useEffect } from "react";
import { View } from "react-native";
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
import Svg, { Circle, Defs, G, Mask, Path, SvgProps } from "react-native-svg";

const AnimatedG = Animated.createAnimatedComponent(G);

interface SvgIconProps extends SvgProps {
  shouldAnimate?: boolean;
  loop?: boolean;
  repeatCount?: number;
  size?: number | string;
  width?: number | string;
  height?: number | string;
}

const TargetFace = ({
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
            withTiming(0.1, { duration: 120, easing: Easing.out(Easing.exp) }),
          ),
          withTiming(1, { duration: 120, easing: Easing.out(Easing.exp) }),
        ),
        -1,
        false,
      );
      wiggle.value = withRepeat(
        withSequence(
          withTiming(2, { duration: 100, easing: Easing.out(Easing.exp) }),
          withTiming(-2, { duration: 100, easing: Easing.out(Easing.exp) }),
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
  const arrowProps = useAnimatedProps(() => ({
    transform: [{ rotate: wigRot.value }] as any,
    originX: 36,
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
            id="targM"
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
        <G mask="url(#targM)">
          <Path
            fill="#FFEBEE"
            d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
          />
          <Circle
            cx="24"
            cy="24"
            r="24"
            stroke="#E53935"
            strokeWidth="8"
            fill="none"
            opacity="0.2"
          />
          <Path
            fill="#FFCDD2"
            d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
          />
          <AnimatedG animatedProps={eyeProps}>
            <Circle cx="16.8" cy="24" r="7.2" fill="#FFF" />
            <Circle cx="31.2" cy="24" r="7.2" fill="#FFF" />
            <Circle cx="16.8" cy="24" r="3" fill="#B71C1C" />
            <Circle cx="16.8" cy="24" r="1" fill="#FFF" />
            <Circle cx="31.2" cy="24" r="3" fill="#B71C1C" />
            <Circle cx="31.2" cy="24" r="1" fill="#FFF" />
          </AnimatedG>
          <Path
            stroke="#B71C1C"
            strokeWidth="2.5"
            strokeLinecap="round"
            d="M22 34q2-2 4 0"
            fill="none"
          />
          <AnimatedG animatedProps={arrowProps}>
            <Path
              stroke="#B71C1C"
              strokeWidth="3"
              strokeLinecap="round"
              d="M36 10l6-6"
            />
            <Path fill="#B71C1C" d="M36 10l-2 3l5 0z" />
          </AnimatedG>
        </G>
      </Svg>
    </View>
  );
};
export default React.memo(TargetFace);
