import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
} from "react-native-reanimated";
import Svg, {
  Circle,
  ClipPath,
  Defs,
  G,
  Mask,
  Path,
  Rect,
  SvgProps,
} from "react-native-svg";

const AnimatedG = Animated.createAnimatedComponent(G);

interface SvgIconProps extends SvgProps {
  shouldAnimate?: boolean;
  loop?: boolean;
  repeatCount?: number;
  size?: number | string;
  width?: number | string;
  height?: number | string;
  transparentBg?: boolean;
}

const FinishLineCoolFace = ({
  size = 48,
  width,
  height,
  shouldAnimate = true,
  transparentBg,
  ...props
}: SvgIconProps) => {
  const activeWidth = width || size;
  const activeHeight = height || size;

  // 1. Waving Tape Animation
  const waveTime = useSharedValue(0);
  // 2. Sunglasses Glare Animation
  const glareTime = useSharedValue(0);
  // 3. Falling Confetti Animation (Looping from -10 to 60)
  const confettiTime = useSharedValue(0);

  useEffect(() => {
    if (shouldAnimate) {
      waveTime.value = withRepeat(
        withTiming(1, { duration: 1000, easing: Easing.linear }),
        -1,
        false,
      );
      glareTime.value = withRepeat(
        withSequence(
          withDelay(2000, withTiming(1, { duration: 600, easing: Easing.out(Easing.exp) })),
          withTiming(0, { duration: 0 })
        ),
        -1,
        false
      );
      confettiTime.value = withRepeat(
        withTiming(1, { duration: 2500, easing: Easing.linear }),
        -1,
        false,
      );
    } else {
      waveTime.value = 0;
      glareTime.value = 0;
      confettiTime.value = 0;
    }

    return () => {
      cancelAnimation(waveTime);
      cancelAnimation(glareTime);
      cancelAnimation(confettiTime);
    };
  }, [shouldAnimate]);

  // Waving Tape (Checkered Flag) Animation
  const lTapeProps = useAnimatedProps(() => {
    const t = waveTime.value * Math.PI * 2;
    const wave = Math.sin(t) * 1.5;
    return {
      transform: [{ translateY: wave }] as any,
    };
  });

  const rTapeProps = useAnimatedProps(() => {
    const t = waveTime.value * Math.PI * 2;
    // Phase shift the right side (t + 1) for a "passing wave" effect
    const wave = Math.sin(t + 1.2) * 1.5;
    return {
      transform: [{ translateY: wave }] as any,
    };
  });

  // Glare: Horizontal Sheen Sweep (Movie Face Style)
  const glareProps = useAnimatedProps(() => ({
    transform: [
      { translateX: -30 + glareTime.value * 60 },
    ] as any,
  }));

  // Confetti: Cascading down.
  // Named `use*` because it IS a custom hook — it calls useAnimatedProps. The
  // three call sites below are unconditional and in fixed order, so hook order
  // is stable; the old name just hid that from the linter.
  const useConfettiProps = (offset: number, speedMult: number) =>
    useAnimatedProps(() => {
      const progress = (confettiTime.value * speedMult + offset) % 1;
      return {
        transform: [
          { translateY: -10 + progress * 70 },
          { rotate: `${progress * 360}deg` },
        ] as any,
      };
    });

  const c1Props = useConfettiProps(0.1, 1.2);
  const c2Props = useConfettiProps(0.4, 0.9);
  const c3Props = useConfettiProps(0.7, 1.1);

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
            id="finM"
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
          <ClipPath id="shadesC">
            <Path d="M8 22c0 0 2 7 9 7s9-7 9-7H8zM26 22c0 0 2 7 9 7s9-7 9-7H26z" />
          </ClipPath>
        </Defs>
        <G mask="url(#finM)">
          {!transparentBg && (
            <Path
              fill="#FFC107"
              d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
            />
          )}
          {/* The Static Face */}
          <G>
            <Path
              fill="#FFCCBC"
              d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
            />
            <Path
              fill="#263238"
              d="M8 22c0 0 2 7 9 7s9-7 9-7H8zM26 22c0 0 2 7 9 7s9-7 9-7H26z"
            />
              {/* Parallel Line Glares (Refined Sheen - Clips exactly to shades) */}
              <G clipPath="url(#shadesC)">
                <AnimatedG animatedProps={glareProps}>
                  {/* Lens 1 - Soft parallel lines */}
                  <Path fill="#FFF" opacity={0.5} d="M12 21 L14.5 21 L12.5 30 L10 30 Z" />
                  <Path fill="#FFF" opacity={0.4} d="M15.5 21 L16.5 21 L14.5 30 L13.5 30 Z" />
                  
                  {/* Lens 2 - Soft parallel lines */}
                  <Path fill="#FFF" opacity={0.5} d="M30 21 L32.5 21 L30.5 30 L28 30 Z" />
                  <Path fill="#FFF" opacity={0.4} d="M33.5 21 L34.5 21 L32.5 30 L31.5 30 Z" />
                </AnimatedG>
              </G>
            </G>

          <Path
            stroke="#BF360C"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
            d="M22 35q4 2 8-2"
          />

          {/* Waving Checkered Tape (Restored original look) */}
          <AnimatedG animatedProps={lTapeProps}>
            <Rect x="0" y="38" width="20" height="6" fill="#FFF" />
            <Rect x="0" y="38" width="5" height="3" fill="#000" />
            <Rect x="10" y="38" width="5" height="3" fill="#000" />
            <Rect x="5" y="41" width="5" height="3" fill="#000" />
            <Rect x="15" y="41" width="5" height="3" fill="#000" />
          </AnimatedG>
          <AnimatedG animatedProps={rTapeProps}>
            <Rect x="28" y="38" width="20" height="6" fill="#FFF" />
            <Rect x="28" y="38" width="5" height="3" fill="#000" />
            <Rect x="38" y="38" width="5" height="3" fill="#000" />
            <Rect x="33" y="41" width="5" height="3" fill="#000" />
            <Rect x="43" y="41" width="5" height="3" fill="#000" />
          </AnimatedG>

          {/* Falling Confetti */}
          <AnimatedG animatedProps={c1Props}>
            <Rect x="10" y="0" width="3" height="3" fill="#FFF" />
          </AnimatedG>
          <AnimatedG animatedProps={c2Props}>
            <Rect x="38" y="0" width="3" height="3" fill="#000" />
          </AnimatedG>
          <AnimatedG animatedProps={c3Props}>
            <Circle cx="24" cy="0" r="1.5" fill="#FFF" />
          </AnimatedG>
        </G>
      </Svg>
    </View>
  );
};
export default React.memo(FinishLineCoolFace);
