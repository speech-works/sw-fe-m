import React, { useEffect } from "react";
import { View } from "react-native";
import Svg, {
  Defs,
  G,
  Line,
  LinearGradient,
  Path,
  Rect,
  Stop,
  SvgProps,
} from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  withDelay,
} from "react-native-reanimated";

const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedPath = Animated.createAnimatedComponent(Path);

interface AngryFaceProps extends SvgProps {
  size?: number | string;
  shouldAnimate?: boolean;
  loop?: boolean;
  repeatCount?: number;
}

const AngryFace = ({
  size = 48,
  width,
  height,
  shouldAnimate,
  loop,
  repeatCount,
  ...props
}: AngryFaceProps) => {
  const activeWidth = width || size;
  const activeHeight = height || size;

  const upperJawY = useSharedValue(0);
  const lowerJawY = useSharedValue(0);

  // Flame Animations - 3 Layers
  const flameLayer1ScaleY = useSharedValue(1); // Red (Outer)
  const flameLayer2ScaleY = useSharedValue(1); // Orange (Middle)
  const flameLayer3ScaleY = useSharedValue(1); // Yellow (Inner)

  React.useEffect(() => {
    if (!shouldAnimate) {
      upperJawY.value = withTiming(0);
      lowerJawY.value = withTiming(0);
      flameLayer1ScaleY.value = withTiming(1);
      flameLayer2ScaleY.value = withTiming(1);
      flameLayer3ScaleY.value = withTiming(1);
      return;
    }

    // Teeth Grinding Animation
    const duration = 300;
    const easing = Easing.linear;

    upperJawY.value = withRepeat(
      withSequence(
        withTiming(1, { duration: duration, easing }),
        withTiming(0, { duration: duration, easing }),
      ),
      -1,
      true,
    );

    lowerJawY.value = withRepeat(
      withSequence(
        withTiming(-1, { duration: duration, easing }),
        withTiming(0, { duration: duration, easing }),
      ),
      -1,
      true,
    );

    // Flame Animations (Synchronized Pulse)
    const flameEasing = Easing.inOut(Easing.quad);
    const pulseDuration = 900;

    const pulseAnim = withRepeat(
      withSequence(
        withTiming(1.1, { duration: pulseDuration, easing: flameEasing }),
        withTiming(0.95, { duration: pulseDuration, easing: flameEasing }),
      ),
      -1,
      true,
    );

    flameLayer1ScaleY.value = pulseAnim;
    flameLayer2ScaleY.value = pulseAnim;
    flameLayer3ScaleY.value = pulseAnim;
  }, [shouldAnimate]);

  const upperJawProps = useAnimatedProps(() => ({
    transform: [{ translateY: upperJawY.value }],
  }));

  const lowerJawProps = useAnimatedProps(() => ({
    transform: [{ translateY: lowerJawY.value }],
  }));

  // Pivot from Bottom Center
  const layer1Props = useAnimatedProps(() => ({
    transform: [{ scaleY: flameLayer1ScaleY.value }],
    originX: 24,
    originY: 48,
  }));

  const layer2Props = useAnimatedProps(() => ({
    transform: [{ scaleY: flameLayer2ScaleY.value }],
    originX: 24,
    originY: 48,
  }));

  const layer3Props = useAnimatedProps(() => ({
    transform: [{ scaleY: flameLayer3ScaleY.value }],
    originX: 24,
    originY: 48,
  }));

  return (
    <View
      style={{
        width: activeWidth as any,
        height: activeHeight as any,
        borderRadius: (typeof activeWidth === "number" ? activeWidth : 48) / 2,
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
          {/* Medium Blur to soften the points just a bit */}

          <LinearGradient id="redGradient" x1="0%" y1="100%" x2="0%" y2="0%">
            <Stop offset="0%" stopColor="#8B0000" />
            <Stop offset="100%" stopColor="#DC143C" />
          </LinearGradient>
          <LinearGradient id="orangeGradient" x1="0%" y1="100%" x2="0%" y2="0%">
            <Stop offset="0%" stopColor="#FF4500" />
            <Stop offset="100%" stopColor="#FF8C00" />
          </LinearGradient>
          <LinearGradient id="yellowGradient" x1="0%" y1="100%" x2="0%" y2="0%">
            <Stop offset="0%" stopColor="#FFD700" />
            <Stop offset="100%" stopColor="#FFFF00" />
          </LinearGradient>
        </Defs>

        {/* --- MASKED GROUP STARTS --- */}
        <G>
          {/* 1. Background Circle Color */}
          <Path
            fill="#4A0000" // Even darker base
            d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
          />

          {/* 2. Three-Layered Flame Animation (Stylized Sharp Fire) */}
          <G>
            {/* Layer 1: Red - Cheekbone Flares */}
            <AnimatedPath
              d="M-5 50 
               L -2 30 
               Q 0 25 4 15   L 4 15
               Q 10 35 18 45 L 18 45
               Q 24 48 30 45 L 30 45
               Q 38 35 44 15 L 44 15
               Q 48 25 50 30
               L 53 50 
               Z"
              fill="url(#redGradient)"
              animatedProps={layer1Props}
            />

            {/* Layer 2: Orange - Side Burns */}
            <AnimatedPath
              d="M0 50 
               L 2 40 
               Q 5 30 8 20   L 8 20
               Q 12 35 20 42 L 20 42
               Q 24 45 28 42 L 28 42
               Q 36 35 40 20 L 40 20
               Q 43 30 46 40
               L 48 50 
               Z"
              fill="url(#orangeGradient)"
              animatedProps={layer2Props}
            />

            {/* Layer 3: Yellow - Forehead Flame */}
            <AnimatedPath
              d="M12 50 
               L 16 45 
               Q 20 20 24 10 L 24 10
               Q 28 20 32 45
               L 36 50 
               Z"
              fill="url(#yellowGradient)"
              animatedProps={layer3Props}
            />
          </G>

          {/* 3. Face Shape (Static) - Covers center */}
          <G>
            <Path
              fill="#F28B82"
              d="M7.628 10.176c0-2.805 33.119-2.805 33.119 0 2.76 0 2.76 39.26 0 39.26 0 2.805-33.119 2.805-33.119 0-2.76 0-2.76-39.26 0-39.26"
            />
          </G>

          {/* 4. Facial Features (On top of face) */}
          {/* Eyebrows */}
          <Path
            fill="#4A4A4A"
            d="m24.292 16.019-11.591-3.106-.994 3.71 11.591 3.105z"
          />
          <Path
            fill="#4A4A4A"
            d="M35.298 12.913 23.707 16.02l.994 3.71 11.591-3.107z"
          />
          {/* Eyes */}
          <Path
            fill="#FFF8F8"
            d="M16.8 31.2a7.2 7.2 0 1 0 0-14.4 7.2 7.2 0 0 0 0 14.4"
          />
          <Path
            fill="#FFF8F8"
            d="M31.2 31.2a7.2 7.2 0 1 0 0-14.4 7.2 7.2 0 0 0 0 14.4"
          />
          {/* Pupils */}
          <Path
            fill="#6D6D6D"
            d="M16.8 28.32a4.32 4.32 0 1 0 0-8.64 4.32 4.32 0 0 0 0 8.64M31.2 28.32a4.32 4.32 0 1 0 0-8.64 4.32 4.32 0 0 0 0 8.64"
          />

          {/* Grinding Mouth Area - Split in 2 Parts - Vertically Animated */}
          <G transform="translate(0, 35)">
            {/* Mouth Cavity Dark Background */}
            <Rect x="13" y="-3" width="22" height="12" rx="3" fill="#300000" />

            {/* Upper Teeth Set (White Block) */}
            <AnimatedG animatedProps={upperJawProps}>
              {/* Main block */}
              <Path d="M15 -2 H 33 V 2.5 H 15 Z" fill="#FFFFFF" />
              {/* Dividing Lines */}
              <Line
                x1="19.5"
                y1="-2"
                x2="19.5"
                y2="2.5"
                stroke="#300000"
                strokeWidth="0.5"
              />
              <Line
                x1="24"
                y1="-2"
                x2="24"
                y2="2.5"
                stroke="#300000"
                strokeWidth="0.5"
              />
              <Line
                x1="28.5"
                y1="-2"
                x2="28.5"
                y2="2.5"
                stroke="#300000"
                strokeWidth="0.5"
              />
            </AnimatedG>

            {/* Lower Teeth Set (White Block) */}
            <AnimatedG animatedProps={lowerJawProps}>
              {/* Main block starting lower */}
              <Path d="M15 3.5 H 33 V 8 H 15 Z" fill="#FFFFFF" />
              {/* Dividing Lines */}
              <Line
                x1="19.5"
                y1="3.5"
                x2="19.5"
                y2="8"
                stroke="#300000"
                strokeWidth="0.5"
              />
              <Line
                x1="24"
                y1="3.5"
                x2="24"
                y2="8"
                stroke="#300000"
                strokeWidth="0.5"
              />
              <Line
                x1="28.5"
                y1="3.5"
                x2="28.5"
                y2="8"
                stroke="#300000"
                strokeWidth="0.5"
              />
            </AnimatedG>
          </G>
        </G>
      </Svg>
    </View>
  );
};

export default AngryFace;
