import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withSequence,
  withTiming,
  cancelAnimation,
} from "react-native-reanimated";
import Svg, {
  Circle,
  Defs,
  G,
  LinearGradient,
  Path,
  RadialGradient,
  Stop,
  SvgProps,
} from "react-native-svg";

const AnimatedG = Animated.createAnimatedComponent(G);

export type BreathingPhase =
  | "idle"
  | "inhale"
  | "hold-in"
  | "exhale"
  | "hold-out";

interface SvgIconProps extends SvgProps {
  size?: number | string;
  width?: number | string;
  height?: number | string;
  phase?: BreathingPhase;
  shouldAnimate?: boolean;
  transparentBg?: boolean;
}

const GuidedBreathingFace = ({
  size = 48,
  width,
  height,
  phase = "idle",
  shouldAnimate = true,
  transparentBg = false,
  ...props
}: SvgIconProps) => {
  const activeWidth = width || size;
  const activeHeight = height || size;

  // Scale fixed at 1 (disabled zoom)
  const scale = useSharedValue(1);
  const breathOpacity = useSharedValue(0);

  const eyeTranslateY = useSharedValue(0);
  const blink = useSharedValue(1);

  useEffect(() => {
    if (!shouldAnimate) {
      blink.value = 1;
      return;
    }
    blink.value = 1;

    const DURATION = 500; // Standard transition duration

    const TRANSITION_DURATION = 600; // Balancing fluidity and response

    switch (phase) {
      case "idle":
        eyeTranslateY.value = withTiming(0, {
          duration: TRANSITION_DURATION,
          easing: Easing.inOut(Easing.ease),
        });
        breathOpacity.value = withTiming(0, {
          duration: TRANSITION_DURATION,
          easing: Easing.inOut(Easing.ease),
        });
        break;

      case "inhale":
        // Eyes: Lift subtly but noticeably (-2 units in a 48-unit viewBox)
        eyeTranslateY.value = withTiming(-2, {
          duration: TRANSITION_DURATION,
          easing: Easing.inOut(Easing.ease),
        });
        // Breath: Invisible
        breathOpacity.value = withTiming(0, {
          duration: 200,
          easing: Easing.out(Easing.exp),
        });
        break;

      case "hold-in":
        // Eyes: Stay Lifted
        eyeTranslateY.value = withTiming(-2, {
          duration: 300,
          easing: Easing.out(Easing.exp),
        });
        // Breath: Invisible
        breathOpacity.value = withTiming(0, {
          duration: 200,
          easing: Easing.out(Easing.exp),
        });
        break;

      case "exhale":
        // Eyes: Relax back to original position (0)
        eyeTranslateY.value = withTiming(0, {
          duration: TRANSITION_DURATION,
          easing: Easing.inOut(Easing.ease),
        });
        // Breath: Visible (fade in)
        breathOpacity.value = withSequence(
          withTiming(1, { duration: 300, easing: Easing.out(Easing.exp) }),
        );
        break;

      case "hold-out":
        // Eyes: Stay Relaxed
        eyeTranslateY.value = withTiming(0, {
          duration: 300,
          easing: Easing.out(Easing.exp),
        });
        // Breath: fade out
        breathOpacity.value = withTiming(0, {
          duration: 300,
          easing: Easing.out(Easing.exp),
        });
        break;
    }

    return () => {
      cancelAnimation(blink);
      cancelAnimation(eyeTranslateY);
      cancelAnimation(breathOpacity);
      cancelAnimation(scale);
    };
  }, [phase]);

  const animatedGroupProps = useAnimatedProps(() => {
    return {
      transform: [{ scale: scale.value }] as any,
    };
  });

  const animatedBreathProps = useAnimatedProps(() => {
    return {
      opacity: breathOpacity.value,
    };
  });

  const animatedEyesProps = useAnimatedProps(() => {
    return {
      // Minimal transform for steady, non-blinking eyes
      transform: [
        { translateY: eyeTranslateY.value },
      ] as any,
    };
  });

  return (
    <View
      style={{
        width: activeWidth as any,
        height: activeHeight as any,
        borderRadius: (typeof activeWidth === "number" ? activeWidth : 48) / 2,
        overflow: "hidden",
        backgroundColor: transparentBg ? "transparent" : undefined,
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
          <LinearGradient id="night_sky" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#0F172A" />
            <Stop offset="0.5" stopColor="#1E293B" />
            <Stop offset="1" stopColor="#334155" />
          </LinearGradient>
          <RadialGradient
            id="moon_glow"
            cx="24"
            cy="22"
            rx="18"
            ry="18"
            fx="24"
            fy="22"
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0" stopColor="#FEF3C7" stopOpacity="0.4" />
            <Stop offset="0.6" stopColor="#FEF3C7" stopOpacity="0.1" />
            <Stop offset="1" stopColor="#FEF3C7" stopOpacity="0" />
          </RadialGradient>
        </Defs>

        {/* Main Face Group - Scaling animation applied here */}
        <AnimatedG origin="24, 24" animatedProps={animatedGroupProps}>
          {/* 1. SKY BACKGROUND - Using Path instead of Rect to ensure compatibility */}
          {!transparentBg && <Path d="M0 0 H48 V48 H0 Z" fill="url(#night_sky)" />}

          {/* 2. STARS (Static) */}
          <Circle cx="10" cy="10" r="0.5" fill="#FFF" opacity="0.8" />
          <Circle cx="38" cy="8" r="0.4" fill="#FFF" opacity="0.6" />
          <Circle cx="4" cy="20" r="0.3" fill="#FFF" opacity="0.5" />
          <Circle cx="44" cy="22" r="0.3" fill="#FFF" opacity="0.7" />
          <Circle cx="16" cy="5" r="0.3" fill="#FFF" opacity="0.4" />
          <Circle cx="30" cy="4" r="0.2" fill="#FFF" opacity="0.5" />

          {/* 3. GLOWING MOON (Behind Face) */}
          {/* Outer Glow */}
          <Circle cx="24" cy="22" r="14" fill="url(#moon_glow)" />
          {/* Moon Body */}
          <Circle cx="24" cy="22" r="6" fill="#FEF3C7" opacity="0.9" />

          {/* 4. FOREST SILHOUETTE (Bottom Horizon) */}
          <Path
            fill="#020617" // Very dark blue/black
            d="M0 48 V 32 L 4 36 L 8 28 L 12 34 L 16 30 L 22 40 L 26 30 L 30 36 L 36 28 L 40 34 L 44 26 L 48 32 V 48 H 0 Z"
            opacity="0.6"
          />
          <Path
            fill="#0F172A" // Dark Slate
            d="M0 48 V 40 Q 12 42, 24 41 Q 36 40, 48 38 V 48 H 0 Z"
            opacity="0.8"
          />

          {/* Shadow - Vector approximation (Slightly adjusted for new bg) */}
          <Path
            fill="black"
            opacity={0.15}
            transform="translate(4, 4)"
            d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
          />
          {/* Face Shape - Light Terracotta (skin tone) */}
          <Path
            fill="#FFCCBC"
            d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
          />

          {/* Eyes - Consolidated group with manual origin math to prevent coordinate drift */}
          <AnimatedG animatedProps={animatedEyesProps}>
            <Path
              stroke="#000000" // Black
              strokeWidth="2.5"
              strokeLinecap="round"
              d="M14 24 Q 18 23, 22 24"
              fill="none"
            />
            <Path
              stroke="#000000" // Black
              strokeWidth="2.5"
              strokeLinecap="round"
              d="M26 24 Q 30 23, 34 24"
              fill="none"
            />
          </AnimatedG>

          {/* Breath Visual: Stream of air blowing OUT (below mouth) */}
          <AnimatedG animatedProps={animatedBreathProps}>
            {/* Center Stream */}
            <Path
              d="M24 38 C 24 40, 24 43, 22 45"
              stroke="#90A4AE" // Light Blue-Grey for air
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
            />
            {/* Left Stream */}
            <Path
              d="M21 38 C 20 40, 18 43, 16 44"
              stroke="#90A4AE"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
            />
            {/* Right Stream */}
            <Path
              d="M27 38 C 28 40, 30 43, 32 44"
              stroke="#90A4AE"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
            />
          </AnimatedG>
        </AnimatedG>
      </Svg>
    </View>
  );
};
export default React.memo(GuidedBreathingFace);
