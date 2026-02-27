import React, { useEffect } from "react";
import { View } from "react-native";
import Svg, { Circle, Defs, G, Mask, Path, SvgProps } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
  useDerivedValue,
} from "react-native-reanimated";

const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface SvgIconProps extends SvgProps {
  shouldAnimate?: boolean;
  loop?: boolean;
  repeatCount?: number;
  size?: number | string;
  width?: number | string;
  height?: number | string;
}

const InspectorFace = ({
  size = 48,
  width,
  height,
  shouldAnimate = false,
  ...props
}: SvgIconProps) => {
  const activeWidth = width || size;
  const activeHeight = height || size;
  const blink = useSharedValue(1);
  const shimmer = useSharedValue(0);

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
      shimmer.value = withRepeat(
        withSequence(
          withDelay(
            2000,
            withTiming(1, { duration: 800, easing: Easing.out(Easing.exp) }),
          ),
          withTiming(0, { duration: 0 }),
        ),
        -1,
        false,
      );
    } else {
      blink.value = 1;
      shimmer.value = 0;
    }
  }, [shouldAnimate]);

  const blinkS = useDerivedValue(() => blink.value);
  const shimOp = useDerivedValue(() => 0.5 + shimmer.value * 0.3);
  const shimW = useDerivedValue(() => 2 + shimmer.value * 1);

  const eyeProps = useAnimatedProps(() => ({
    transform: [{ scaleY: blinkS.value }] as any,
    originY: 24,
  }));
  const shimProps = useAnimatedProps(() => ({
    opacity: shimOp.value,
    strokeWidth: shimW.value,
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
            id="inspM"
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
        <G mask="url(#inspM)">
          <Path
            fill="#607D8B"
            d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
          />
          <Path
            fill="#CFD8DC"
            d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
          />
          <AnimatedG animatedProps={eyeProps}>
            <Circle cx="16.8" cy="24" r="7.2" fill="#FFF" />
            <Circle cx="16.8" cy="24" r="3" fill="#37474F" />
            <Path fill="#FFF" d="M30 34a10 10 0 1 0 0-20 10 10 0 0 0 0 20" />
            <Circle cx="30" cy="24" r="4.5" fill="#37474F" />
          </AnimatedG>
          <Path
            stroke="#37474F"
            strokeWidth="3"
            strokeLinecap="round"
            d="M36 36l6 6"
          />
          <AnimatedCircle
            cx="30"
            cy="24"
            r="11"
            stroke="#37474F"
            fill="#E0F7FA"
            animatedProps={shimProps}
          />
          <Path
            stroke="#37474F"
            strokeWidth="2.5"
            strokeLinecap="round"
            d="M18 36q4 2 8 0"
            fill="none"
          />
        </G>
      </Svg>
    </View>
  );
};
export default React.memo(InspectorFace);
