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
} from "react-native-reanimated";
import Svg, { Circle, Defs, G, Mask, Path, SvgProps } from "react-native-svg";

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

const CuriousFace = ({
  size = 48,
  width,
  height,
  shouldAnimate = false,
  ...props
}: SvgIconProps) => {
  const activeWidth = width || size;
  const activeHeight = height || size;
  const blink = useSharedValue(1);
  const brow = useSharedValue(0);

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
      brow.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1000, easing: Easing.out(Easing.exp) }),
          withTiming(0, { duration: 1000, easing: Easing.out(Easing.exp) }),
        ),
        -1,
        true,
      );
    } else {
      blink.value = 1;
      brow.value = 0;
    }
  }, [shouldAnimate]);

  const blinkS = useDerivedValue(() => blink.value);
  const lBrowY = useDerivedValue(() => brow.value * -1.5);
  const rBrowY = useDerivedValue(() => brow.value * 1.5);

  const eyeProps = useAnimatedProps(() => ({
    transform: [{ scaleY: blinkS.value }] as any,
    originY: 24,
  }));
  const lBrowProps = useAnimatedProps(() => ({
    transform: [{ translateY: lBrowY.value }] as any,
  }));
  const rBrowProps = useAnimatedProps(() => ({
    transform: [{ translateY: rBrowY.value }] as any,
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
            id="curM"
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
        <G mask="url(#curM)">
          <Path
            fill="#80CBC4"
            d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
          />
          <Path
            fill="#E0F2F1"
            d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
          />
          <AnimatedG animatedProps={eyeProps}>
            <Circle cx="16.8" cy="24" r="7.2" fill="#FFF" />
            <Circle cx="31.2" cy="24" r="7.2" fill="#FFF" />
            <Path
              fill="#4A4A4A"
              d="M20 26a4 4 0 1 0 0-8 4 4 0 0 0 0 8M34.4 26a4 4 0 1 0 0-8 4 4 0 0 0 0 8"
            />
          </AnimatedG>
          <Circle cx="24" cy="34" r="3" fill="#4A4A4A" />
          <AnimatedPath
            stroke="#4A4A4A"
            strokeWidth="2.5"
            strokeLinecap="round"
            d="M12 16q4.8 0 9.6 0"
            animatedProps={lBrowProps}
          />
          <AnimatedPath
            stroke="#4A4A4A"
            strokeWidth="2.5"
            strokeLinecap="round"
            d="M26.4 12q4.8-4 9.6 0"
            animatedProps={rBrowProps}
          />
        </G>
      </Svg>
    </View>
  );
};
export default React.memo(CuriousFace);
