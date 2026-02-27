import React from "react";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";
import Svg, { Circle, Defs, G, Mask, Path, SvgProps } from "react-native-svg";

const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const RobotoicPhoneFace = ({
  size = 48,
  shouldAnimate = false,
  loop = false,
  repeatCount = 1,
  ...props
}: SvgProps & {
  size?: number | string;
  shouldAnimate?: boolean;
  loop?: boolean;
  repeatCount?: number;
}) => {
  const rotation = useSharedValue(0);
  const pulse = useSharedValue(1);

  React.useEffect(() => {
    if (shouldAnimate) {
      rotation.value = withRepeat(
        withSequence(
          withTiming(90, { duration: 1000, easing: Easing.inOut(Easing.quad) }),
          withDelay(
            500,
            withTiming(0, { duration: 800, easing: Easing.inOut(Easing.quad) }),
          ),
          withDelay(2000, withTiming(45, { duration: 600 })),
          withTiming(0, { duration: 500 }),
        ),
        -1,
        false,
      );
      pulse.value = withRepeat(
        withSequence(
          withDelay(
            Math.random() * 2000 + 3000,
            withTiming(1.5, { duration: 200 }),
          ),
          withTiming(1, { duration: 200 }),
        ),
        -1,
        false,
      );
    } else {
      rotation.value = 0;
      pulse.value = 1;
    }
  }, [shouldAnimate]);

  const dialProps = useAnimatedProps(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
    originX: 24,
    originY: 26,
  }));

  const holeProps = useAnimatedProps(() => ({
    transform: [{ scale: pulse.value }],
    originX: 24,
    originY: 26,
  }));

  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none" {...props}>
      <Defs>
        <Mask id="mask_rotary">
          <Path
            fill="#fff"
            d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
          />
        </Mask>
      </Defs>

      <G mask="url(#mask_rotary)">
        {/* Background: Wallpaper Pattern */}
        <Path
          fill="#F0E68C"
          d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
        />
        {/* Face: Black Bakelite */}
        <G>
          <Path
            fill="#212121"
            d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
          />
        </G>
        {/* The Dial Mechanism */}
        <AnimatedG animatedProps={dialProps}>
          <Circle
            cx="24"
            cy="26"
            r="10"
            fill="#424242"
            stroke="#E0E0E0"
            strokeWidth="1"
          />
          <Circle cx="24" cy="26" r="3" fill="#E0E0E0" />
          {/* Finger Holes (Eyes/Mouth area) */}
          <AnimatedG animatedProps={holeProps}>
            <Circle cx="24" cy="18" r="1.5" fill="#FFFFFF" />
            <Circle cx="30" cy="20" r="1.5" fill="#FFFFFF" />
            <Circle cx="18" cy="20" r="1.5" fill="#FFFFFF" />
            <Circle cx="32" cy="26" r="1.5" fill="#FFFFFF" />
            <Circle cx="16" cy="26" r="1.5" fill="#FFFFFF" />
          </AnimatedG>
        </AnimatedG>
        {/* Coiled Cord */}
        <Path
          d="M12 40 Q 8 44, 12 48 M 12 42 Q 16 46, 12 50"
          stroke="#212121"
          strokeWidth="2"
          fill="none"
        />
      </G>
    </Svg>
  );
};
export default React.memo(RobotoicPhoneFace);
