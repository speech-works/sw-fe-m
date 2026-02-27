import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, {
    Easing,
    useAnimatedProps,
    useDerivedValue,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming,
} from "react-native-reanimated";
import Svg, {
    Circle,
    Defs,
    Ellipse,
    G,
    LinearGradient,
    Path,
    Stop,
    SvgProps
} from "react-native-svg";

const AnimatedG = Animated.createAnimatedComponent(G);

interface SvgIconProps extends SvgProps {
  shouldAnimate?: boolean;
  loop?: boolean;
  repeatCount?: number;
  size?: number | string;
}

const CalmFace = ({
  size = 48,
  width,
  height,
  shouldAnimate = false,
  ...props
}: SvgIconProps) => {
  const activeWidth = width || size;
  const activeHeight = height || size;
  const wind = useSharedValue(0);
  const halo = useSharedValue(0);

  useEffect(() => {
    if (shouldAnimate) {
      wind.value = withRepeat(
        withTiming(48, { duration: 2000, easing: Easing.linear }),
        -1,
        false,
      );
      halo.value = withRepeat(
        withSequence(
          withTiming(-2, { duration: 1500, easing: Easing.out(Easing.exp) }),
          withTiming(0, { duration: 1500, easing: Easing.out(Easing.exp) }),
        ),
        -1,
        true,
      );
    } else {
      wind.value = 0;
      halo.value = 0;
    }
  }, [shouldAnimate]);

  const windOff = useDerivedValue(() => -wind.value);
  const haloY = useDerivedValue(() => halo.value);

  const windProps = useAnimatedProps(() => ({
    strokeDashoffset: windOff.value,
  }));
  const haloProps = useAnimatedProps(() => ({
    transform: [{ translateY: haloY.value }] as any,
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
          <LinearGradient id="haloG" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#FDB931" />
            <Stop offset="40%" stopColor="#FFFFAC" />
            <Stop offset="100%" stopColor="#D4AF37" />
          </LinearGradient>
        </Defs>
        <Path
          fill="#B8DCC2"
          d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
        />
        <AnimatedG animatedProps={haloProps}>
          <Ellipse
            cx="24"
            cy="7"
            rx="14"
            ry="4"
            fill="none"
            stroke="url(#haloG)"
            strokeWidth="2.5"
          />
        </AnimatedG>
        <AnimatedG animatedProps={windProps}>
          <Path
            d="M-24 10h96"
            stroke="#FFF"
            strokeWidth="3"
            strokeOpacity="0.4"
            strokeDasharray="12 36"
            strokeLinecap="round"
          />
          <Path
            d="M-12 24h96"
            stroke="#FFF"
            strokeWidth="2"
            strokeOpacity="0.3"
            strokeDasharray="8 40"
            strokeLinecap="round"
          />
          <Path
            d="M-36 38h96"
            stroke="#FFF"
            strokeWidth="3"
            strokeOpacity="0.4"
            strokeDasharray="16 32"
            strokeLinecap="round"
          />
        </AnimatedG>
        <Path
          fill="#E7E2CB"
          d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
        />
        <Circle cx="16.8" cy="24" r="7.2" fill="#FFF" />
        <Circle cx="31.2" cy="24" r="7.2" fill="#FFF" />
        <Path
          fill="#4A4A4A"
          d="M16.8 28.32a4.32 4.32 0 1 0 0-8.64 4.32 4.32 0 0 0 0 8.64M31.2 28.32a4.32 4.32 0 1 0 0-8.64 4.32 4.32 0 0 0 0 8.64"
        />
        <Path
          stroke="#4A4A4A"
          strokeLinecap="round"
          strokeWidth="3.558"
          d="M16.8 36q7.2 4.8 14.4 0"
        />
      </Svg>
    </View>
  );
};
export default React.memo(CalmFace);
