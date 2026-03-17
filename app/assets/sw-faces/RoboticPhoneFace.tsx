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
import Svg, { Circle, Defs, G, Mask, Path, SvgProps } from "react-native-svg";

const AnimatedG = Animated.createAnimatedComponent(G);

const RoboticPhoneFace = ({
  size = 48,
  shouldAnimate = false,
  ...props
}: SvgProps & {
  size?: number | string;
  shouldAnimate?: boolean;
  transparentBg?: boolean;
}) => {
  const rotation = useSharedValue(0);
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (shouldAnimate) {
      rotation.value = withRepeat(
        withSequence(
          withTiming(90, { duration: 1000, easing: Easing.out(Easing.exp) }),
          withDelay(
            500,
            withTiming(0, { duration: 800, easing: Easing.out(Easing.exp) }),
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
            withTiming(1.5, { duration: 150 }),
          ),
          withTiming(1, { duration: 150 }),
        ),
        -1,
        false,
      );
    } else {
      rotation.value = 0;
      pulse.value = 1;
    }
  
    return () => {
      cancelAnimation(rotation);
      cancelAnimation(pulse);
    };
  }, [shouldAnimate]);

  const rotDeg = useDerivedValue(() => `${rotation.value}deg`);
  const pulseS = useDerivedValue(() => pulse.value);

  const dialProps = useAnimatedProps(() => ({
    transform: [{ rotate: rotDeg.value }] as any,
    originX: 24,
    originY: 26,
  }));
  const holeProps = useAnimatedProps(() => ({
    transform: [{ scale: pulseS.value }] as any,
    originX: 24,
    originY: 26,
  }));

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      style={{ backgroundColor: transparentBg ? "transparent" : undefined }}
      {...props}
    >
      <Defs>
        <Mask id="robM">
          <Path
            fill="#fff"
            d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
          />
        </Mask>
      </Defs>
      <G mask="url(#robM)">
        {!transparentBg && (
          <Path
            fill="#F0E68C"
            d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
          />
        )}
        <Path
          fill="#212121"
          d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
        />
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
          <AnimatedG animatedProps={holeProps}>
            <Circle cx="24" cy="18" r="1.5" fill="#FFF" />
            <Circle cx="30" cy="20" r="1.5" fill="#FFF" />
            <Circle cx="18" cy="20" r="1.5" fill="#FFF" />
            <Circle cx="32" cy="26" r="1.5" fill="#FFF" />
            <Circle cx="16" cy="26" r="1.5" fill="#FFF" />
          </AnimatedG>
        </AnimatedG>
        <Path
          d="M12 40q-4 4 0 8m0-6q4 4 0 8"
          stroke="#212121"
          strokeWidth="2"
          fill="none"
        />
      </G>
    </Svg>
  );
};
export default React.memo(RoboticPhoneFace);
