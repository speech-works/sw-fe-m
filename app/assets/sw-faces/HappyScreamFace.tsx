import { View } from "react-native";
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  Mask,
  Path,
  SvgProps,
} from "react-native-svg";
import * as React from "react";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  useDerivedValue,
} from "react-native-reanimated";
import { useEffect } from "react";

const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedLine = Animated.createAnimatedComponent(Line);

interface SvgIconProps extends SvgProps {
  shouldAnimate?: boolean;
  loop?: boolean;
  repeatCount?: number;
  size?: number | string;
  width?: number | string;
  height?: number | string;
}

const HappyScreamFace = ({
  size = 48,
  width,
  height,
  shouldAnimate = false,
  ...props
}: SvgIconProps) => {
  const activeWidth = width || size;
  const activeHeight = height || size;

  const blink = useSharedValue(1);
  const excitement = useSharedValue(0);

  useEffect(() => {
    if (shouldAnimate) {
      blink.value = withRepeat(
        withSequence(
          withDelay(
            Math.random() * 2000 + 3000,
            withTiming(0, { duration: 100 }),
          ),
          withTiming(1, { duration: 100 }),
        ),
        -1,
        false,
      );
      excitement.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 150 }),
          withTiming(0, { duration: 150 }),
        ),
        -1,
        true,
      );
    } else {
      blink.value = 1;
      excitement.value = 0;
    }
  }, [shouldAnimate]);

  const blinkS = useDerivedValue(() => blink.value);
  const exciteVal = useDerivedValue(() => excitement.value * 2);
  const exciteInv = useDerivedValue(() => excitement.value * -2);

  const eyeProps = useAnimatedProps(() => ({
    transform: [{ scaleY: blinkS.value }] as any,
    originY: 21,
  }));
  const l1Props = useAnimatedProps(() => ({
    transform: [{ translateX: exciteVal.value }] as any,
  }));
  const l2Props = useAnimatedProps(() => ({
    transform: [{ translateY: exciteVal.value }] as any,
  }));
  const l3Props = useAnimatedProps(() => ({
    transform: [{ translateX: exciteInv.value }] as any,
  }));
  const l4Props = useAnimatedProps(() => ({
    transform: [{ translateY: exciteInv.value }] as any,
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
            id="scrM"
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
        <G mask="url(#scrM)">
          <Path
            fill="#009688"
            d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
          />
          <Path
            fill="#FFEB3B"
            d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
          />
          <AnimatedG animatedProps={eyeProps}>
            <Path
              stroke="#212121"
              strokeWidth="3"
              strokeLinecap="round"
              d="M15 22q2-2 4 0M29 22q2-2 4 0"
              fill="none"
            />
          </AnimatedG>
          <Circle cx="24" cy="35" r="5" fill="#212121" />
          <Circle cx="24" cy="37" r="2.5" fill="#D32F2F" />
          <AnimatedLine
            x1="45"
            y1="24"
            x2="48"
            y2="24"
            stroke="#FF4081"
            strokeWidth="2"
            strokeLinecap="round"
            animatedProps={l1Props}
          />
          <AnimatedLine
            x1="38"
            y1="40"
            x2="40"
            y2="42"
            stroke="#FF4081"
            strokeWidth="2"
            strokeLinecap="round"
            animatedProps={l2Props}
          />
          <AnimatedLine
            x1="3"
            y1="24"
            x2="0"
            y2="24"
            stroke="#FF4081"
            strokeWidth="2"
            strokeLinecap="round"
            animatedProps={l3Props}
          />
          <AnimatedLine
            x1="10"
            y1="40"
            x2="8"
            y2="42"
            stroke="#FF4081"
            strokeWidth="2"
            strokeLinecap="round"
            animatedProps={l4Props}
          />
        </G>
      </Svg>
    </View>
  );
};
export default React.memo(HappyScreamFace);
