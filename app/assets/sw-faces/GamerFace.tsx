import Animated, {
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
const AnimatedRect = Animated.createAnimatedComponent(Rect);

interface SvgIconProps extends SvgProps {
  size?: number | string;
  width?: number | string;
  height?: number | string;
  shouldAnimate?: boolean;
  loop?: boolean;
  repeatCount?: number;
  transparentBg?: boolean;
}

const GamerFace = ({
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
  const pulse = useSharedValue(0);

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
      pulse.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1000 }),
          withTiming(0, { duration: 1000 }),
        ),
        -1,
        true,
      );
    } else {
      blink.value = 1;
      pulse.value = 0;
    }
  
    return () => {
      cancelAnimation(blink);
      cancelAnimation(pulse);
    };
  }, [shouldAnimate]);

  const blinkS = useDerivedValue(() => blink.value);
  const bOp = useDerivedValue(() => 0.5 + pulse.value * 0.5);
  const rOp = useDerivedValue(() => 1 - pulse.value * 0.5);

  const eyeProps = useAnimatedProps(() => ({
    transform: [{ scaleY: blinkS.value }] as any,
    originY: 24,
  }));
  const bLed = useAnimatedProps(() => ({ opacity: bOp.value }));
  const rLed = useAnimatedProps(() => ({ opacity: rOp.value }));

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
            id="gamM"
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
        <G mask="url(#gamM)">
          {!transparentBg && (
            <Path
              fill="#A259FB"
              d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
            />
          )}
          <Path
            fill="#FFDABF"
            d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
          />
          <Path
            stroke="#22252B"
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
            d="M4 24C4 12 12 4 24 4s20 8 20 20"
          />
          <Rect x="2" y="18" width="6" height="14" rx="2" fill="#333740" />
          <AnimatedRect
            x="4"
            y="22"
            width="2"
            height="6"
            rx="1"
            fill="#000AFF"
            animatedProps={bLed}
          />
          <Rect x="40" y="18" width="6" height="14" rx="2" fill="#333740" />
          <AnimatedRect
            x="42"
            y="22"
            width="2"
            height="6"
            rx="1"
            fill="#FF0000"
            animatedProps={rLed}
          />
          <AnimatedG animatedProps={eyeProps}>
            <Circle cx="16.8" cy="24" r="7.2" fill="#FFF" />
            <Circle cx="31.2" cy="24" r="7.2" fill="#FFF" />
            <Circle cx="16.8" cy="24" r="2.5" fill="#111215" />
            <Circle cx="31.2" cy="24" r="2.5" fill="#111215" />
          </AnimatedG>
          <Path
            stroke="#22252B"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            d="M40 28l-8 8"
          />
          <Circle cx="32" cy="36" r="2" fill="#22252B" />
        </G>
      </Svg>
    </View>
  );
};
export default React.memo(GamerFace);
