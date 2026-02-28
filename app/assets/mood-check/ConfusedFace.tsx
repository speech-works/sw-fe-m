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

const ConfusedFace = ({
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
            withTiming(0.1, { duration: 120 }),
          ),
          withTiming(1, { duration: 120 }),
        ),
        -1,
        false,
      );
      wiggle.value = withRepeat(
        withSequence(
          withTiming(-3, { duration: 500, easing: Easing.out(Easing.exp) }),
          withTiming(3, { duration: 500, easing: Easing.out(Easing.exp) }),
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

  const eyeS = useDerivedValue(() => blink.value);
  const wigRot = useDerivedValue(() => `${wiggle.value}deg`);

  const eyeProps = useAnimatedProps(() => ({
    transform: [{ scaleY: eyeS.value }] as any,
    originY: 24,
  }));
  const wiggleProps = useAnimatedProps(() => ({
    transform: [{ rotate: wigRot.value }] as any,
    originX: 38,
    originY: 20,
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
            id="confM"
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
        <G mask="url(#confM)">
          <Path
            fill="#9575CD"
            d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
          />
          <Path
            fill="#EDE7F6"
            d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
          />
          <AnimatedG animatedProps={eyeProps}>
            <Circle cx="16.8" cy="24" r="7.2" fill="#FFF" />
            <Circle cx="16.8" cy="24" r="3" fill="#4527A0" />
            <Path fill="#FFF" d="M31.2 29a5 5 0 1 0 0-10 5 5 0 0 0 0 10" />
            <Circle cx="31.2" cy="24" r="2" fill="#4527A0" />
          </AnimatedG>
          <Path
            stroke="#4527A0"
            strokeWidth="2.5"
            strokeLinecap="round"
            d="M18 36l6-2l6 2"
            fill="none"
          />
          <AnimatedG animatedProps={wiggleProps}>
            <Path
              stroke="#FFF"
              strokeWidth="3"
              strokeLinecap="round"
              d="M38 12c0 0 4 0 4 4s-4 2-4 6"
              fill="none"
            />
            <Circle cx="38" cy="26" r="1.5" fill="#FFF" />
          </AnimatedG>
        </G>
      </Svg>
    </View>
  );
};
export default React.memo(ConfusedFace);
