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
import Svg, { Defs, G, Mask, Path, SvgProps } from "react-native-svg";

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

const CoolFace = ({
  size = 48,
  width,
  height,
  shouldAnimate = false,
  ...props
}: SvgIconProps) => {
  const activeWidth = width || size;
  const activeHeight = height || size;
  const blink = useSharedValue(1);
  const smirk = useSharedValue(0);

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
      smirk.value = withRepeat(
        withSequence(
          withTiming(1.5, { duration: 800, easing: Easing.out(Easing.exp) }),
          withTiming(0, { duration: 800, easing: Easing.out(Easing.exp) }),
        ),
        -1,
        true,
      );
    } else {
      blink.value = 1;
      smirk.value = 0;
    }
  }, [shouldAnimate]);

  const blinkS = useDerivedValue(() => blink.value);
  const smirkX = useDerivedValue(() => smirk.value);

  const blinkProps = useAnimatedProps(() => ({
    transform: [{ scaleY: blinkS.value }] as any,
    originY: 24,
  }));
  const smirkProps = useAnimatedProps(() => ({
    transform: [{ translateX: smirkX.value }] as any,
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
            id="coolM"
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
        <G mask="url(#coolM)">
          <Path
            fill="#26C6DA"
            d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
          />
          <Path
            fill="#E0F7FA"
            d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
          />
          <AnimatedG animatedProps={blinkProps}>
            <Path
              fill="#37474F"
              d="M8 20c0 0 2 8 9 8s5-8 5-8H8zM26 20c0 0 2 8 9 8s5-8 5-8H26z"
            />
            <Path stroke="#37474F" strokeWidth="2" d="M22 22h4" />
            <Path
              fill="#546E7A"
              d="M10 21l5 0l-5 4zM28 21l5 0l-5 4z"
              opacity="0.5"
            />
          </AnimatedG>
          <AnimatedPath
            stroke="#37474F"
            strokeWidth="2.5"
            strokeLinecap="round"
            d="M20 34q6 2 10-1"
            fill="none"
            animatedProps={smirkProps}
          />
        </G>
      </Svg>
    </View>
  );
};
export default React.memo(CoolFace);
