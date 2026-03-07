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
  cancelAnimation,
} from "react-native-reanimated";
import Svg, { Circle, G, Path, SvgProps } from "react-native-svg";

const AnimatedG = Animated.createAnimatedComponent(G);

interface SvgIconProps extends SvgProps {
  size?: number | string;
  width?: number | string;
  height?: number | string;
  shouldAnimate?: boolean;
  loop?: boolean;
  repeatCount?: number;
}

const GlassesGroup = () => (
  <G>
    {/* --- CLUBMASTER GLASSES --- */}
    <Path fill="#1A1A1A" d="M8 18 H 22 V 22 C 22 22, 14 22, 8 21 Z" />
    <Path fill="#1A1A1A" d="M26 18 H 40 V 21 C 34 22, 26 22, 26 22 Z" />

    <Path
      d="M8 21 C 8 28, 22 28, 22 21"
      stroke="#BDBDBD"
      strokeWidth="1"
      fill="#1A1A1A"
      fillOpacity="0.8"
    />
    <Path
      d="M26 21 C 26 28, 40 28, 40 21"
      stroke="#BDBDBD"
      strokeWidth="1"
      fill="#1A1A1A"
      fillOpacity="0.8"
    />

    <Path
      d="M22 19 Q 24 18, 26 19"
      stroke="#BDBDBD"
      strokeWidth="1.5"
      fill="none"
    />

    <Path d="M10 19 L 16 19 L 10 24 Z" fill="#FFF" opacity="0.1" />
    <Path d="M28 19 L 34 19 L 28 24 Z" fill="#FFF" opacity="0.1" />
  </G>
);

const ExcitedTouristMapFace = ({
  size = 48,
  width,
  height,
  shouldAnimate = false,
  ...props
}: SvgIconProps) => {
  const activeWidth = width || size;
  const activeHeight = height || size;

  const progress = useSharedValue(0);
  const blink = useSharedValue(1);

  useEffect(() => {
    if (shouldAnimate) {
      progress.value = withRepeat(
        withSequence(
          withTiming(0, { duration: 50 }),
          withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 600 }),
        ),
        -1,
        false,
      );
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
    } else {
      progress.value = withTiming(0);
      blink.value = 1;
    }

    return () => {
      cancelAnimation(progress);
      cancelAnimation(blink);
    };
  }, [shouldAnimate]);

  const P_LIFT = 0.15;
  const P_ORBIT = 0.85;

  const glassesT = useDerivedValue(() => {
    const val = progress.value;
    let s = 1,
      tx = 0,
      ty = 0;
    if (val < P_LIFT) {
      const t = val / P_LIFT;
      s = 1 + t * 0.2;
      ty = -t * 5;
    } else if (val < P_ORBIT) {
      const t = (val - P_LIFT) / (P_ORBIT - P_LIFT);
      const angle = t * Math.PI * 2;
      const R = 30;
      tx = R * Math.sin(angle);
      const Z = R * Math.cos(angle);
      ty = -5;
      s = 1.2 + (Z / R) * 0.4;
    } else {
      const t = (val - P_ORBIT) / (1 - P_ORBIT);
      s = 1.2 - t * 0.2;
      ty = -5 + t * 5;
    }
    return { s, tx, ty };
  });

  const eyeT = useDerivedValue(() => {
    const val = progress.value;
    let ox = 0,
      oy = 0;
    if (val < P_LIFT) {
      oy = -2 * (val / P_LIFT);
    } else if (val < P_ORBIT) {
      const t = (val - P_LIFT) / (P_ORBIT - P_LIFT);
      const angle = t * Math.PI * 2;
      ox = 1.5 * Math.sin(angle);
      oy = -1.5 * Math.cos(angle);
    } else {
      const t = (val - P_ORBIT) / (1 - P_ORBIT);
      oy = -1.5 * (1 - t);
    }
    return { ox, oy };
  });

  const zPos = useDerivedValue(() => {
    if (progress.value < P_LIFT || progress.value >= P_ORBIT) return 1;
    const t = (progress.value - P_LIFT) / (P_ORBIT - P_LIFT);
    return Math.cos(t * Math.PI * 2) > 0 ? 1 : -1;
  });

  const glassesProps = useAnimatedProps(() => ({
    transform: [
      { translateX: 24 },
      { translateY: 20 },
      { translateX: glassesT.value.tx },
      { translateY: glassesT.value.ty },
      { scale: glassesT.value.s },
      { translateX: -24 },
      { translateY: -20 },
    ] as any,
  }));

  const eyeWhiteProps = useAnimatedProps(() => ({
    transform: [{ scaleY: blink.value }] as any,
    originY: 23.5,
  }));

  const eyePupilProps = useAnimatedProps(() => ({
    transform: [
      { translateX: eyeT.value.ox },
      { translateY: eyeT.value.oy },
    ] as any,
  }));

  const frontOpacity = useAnimatedProps(() => ({
    opacity: zPos.value > 0 ? 1 : 0,
  }));
  const backOpacity = useAnimatedProps(() => ({
    opacity: zPos.value < 0 ? 1 : 0,
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
        <Path fill="#01579B" d="M0 0h48v48H0z" />
        <G fill="#4CAF50" opacity="0.9">
          <Path d="M2 2l10-2l6 5l-4 7l-6 3l-6-3zM22 1l4-1l2 4l-4 2zM30 5l5-3l10 2l3 8l-8 6l-8-3zM42 22l6 2l-2 11l-6 3l-2-8zM4 35l8 3l-2 10H2V35zM38 42l6-2l2 5l-4 3H36l2-6z" />
        </G>
        <Path
          d="M0 24h48M24 0v48"
          stroke="#FFF"
          strokeWidth="0.2"
          opacity="0.3"
        />
        <G transform="translate(0, 6)">
          <Path
            fill="black"
            opacity={0.25}
            transform="translate(1, 1)"
            d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
          />
          <AnimatedG animatedProps={glassesProps}>
            <AnimatedG animatedProps={backOpacity}>
              <GlassesGroup />
            </AnimatedG>
          </AnimatedG>
          <Path
            fill="#FFE0B2"
            d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
          />
          <G>
            <Circle cx="15" cy="23.5" r="5" fill="#FFF" />
            <AnimatedG animatedProps={eyePupilProps}>
              <Circle cx="15" cy="23.5" r="2.5" fill="#1A1A1A" />
              <Circle cx="16" cy="22.5" r="0.8" fill="#FFF" />
            </AnimatedG>
            <Circle cx="33" cy="23.5" r="5" fill="#FFF" />
            <AnimatedG animatedProps={eyePupilProps}>
              <Circle cx="33" cy="23.5" r="2.5" fill="#1A1A1A" />
              <Circle cx="34" cy="22.5" r="0.8" fill="#FFF" />
            </AnimatedG>
          </G>
          <AnimatedG animatedProps={glassesProps}>
            <AnimatedG animatedProps={frontOpacity}>
              <GlassesGroup />
            </AnimatedG>
          </AnimatedG>
        </G>
        <Path d="M0 0q12 8 24 0t24 0v6q-24 6-48 0z" fill="#FFF" opacity="0.4" />
      </Svg>
    </View>
  );
};

export default React.memo(ExcitedTouristMapFace);
