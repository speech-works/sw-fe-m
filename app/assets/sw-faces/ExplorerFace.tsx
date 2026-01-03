import React, { useEffect } from "react";
import Svg, {
  Mask,
  Path,
  G,
  Defs,
  Filter,
  FeFlood,
  FeColorMatrix,
  FeOffset,
  FeGaussianBlur,
  FeComposite,
  FeBlend,
  SvgProps,
  Circle,
} from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  interpolate,
  useDerivedValue,
} from "react-native-reanimated";

const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface SvgIconProps extends SvgProps {
  size?: number | string;
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
  shouldAnimate = false, // Default OFF
  loop = false,
  repeatCount = 1,
  ...props
}: SvgIconProps) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (shouldAnimate) {
      progress.value = withRepeat(
        withSequence(
          withTiming(0, { duration: 100 }), // Initial delay
          withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.quad) }), // Orbit
          withTiming(0, { duration: 1000 }) // Reset
        ),
        loop ? -1 : repeatCount,
        false
      );
    } else {
      progress.value = withTiming(0);
    }
  }, [shouldAnimate, loop, repeatCount]);

  // --- Animation Physics Constants ---
  const P_LIFT = 0.15;
  const P_ORBIT = 0.85;

  // --- GLASSES ANIMATION ---
  const glassesAnimatedProps = useAnimatedProps(() => {
    let scale = 1;
    let translateX = 0;
    let translateY = 0;
    const val = progress.value;

    if (val < P_LIFT) {
      // Lift Phase
      const t = val / P_LIFT;
      scale = 1 + t * 0.2;
      translateY = -t * 5;
    } else if (val < P_ORBIT) {
      // Orbit Phase
      const t = (val - P_LIFT) / (P_ORBIT - P_LIFT);
      const angle = t * Math.PI * 2;
      const R = 30;
      translateX = R * Math.sin(angle);
      const Z = R * Math.cos(angle);
      translateY = -5; // stay lifted
      scale = 1.2 + (Z / R) * 0.4;
    } else {
      // Land Phase
      const t = (val - P_ORBIT) / (1 - P_ORBIT);
      scale = 1.2 - t * 0.2;
      translateY = -5 + t * 5;
    }

    return {
      transform: [
        { translateX: 24 },
        { translateY: 20 },
        { translateX },
        { translateY },
        { scale },
        { translateX: -24 },
        { translateY: -20 },
      ],
    };
  });

  // --- EYES TRACKING ANIMATION ---
  const eyesAnimatedProps = useAnimatedProps(() => {
    const val = progress.value;
    let cxOffset = 0;
    let cyOffset = 0;

    // Default centers: Left(15, 23.5), Right(33, 23.5)
    // We offset from there.

    if (val < P_LIFT) {
      // Look up slightly as glasses lift
      const t = val / P_LIFT;
      cyOffset = -2 * t;
    } else if (val < P_ORBIT) {
      // Track the glasses
      const t = (val - P_LIFT) / (P_ORBIT - P_LIFT);
      const angle = t * Math.PI * 2;

      // Orbit Logic re-used to find direction
      // Radius of eye movement
      const R_EYE = 3;

      // Glasses X = R*sin(angle). Front(0) -> Right(90) -> Back(180) -> Left(270) -> Front(360)
      // If angle=0 (Front, Z=High), we look straight? No, at angle 0 the glasses are "Front".
      // Actually in my math above:
      // t=0 -> angle=0 -> sin(0)=0 (Center X), cos(0)=1 (Front Z).
      // So glasses start at Front Center.
      // Eye tracking:

      cxOffset = R_EYE * Math.sin(angle);
      // Z is depth. Y movement depends on if glasses go up/down?
      // They stay at Y=-5 (lifted).
      // But visually if something goes "behind" you, you might look Up or Sideways.
      // Let's implement full circular tracking in 2D projection.
      // If it goes Right (X+), eyes go Right.
      // If it goes Back (Z-), eyes go... Up? Or just smaller?
      // In 2D cartoon logic, "Around the head" usually means Right -> Up/Back -> Left -> Front.

      // Let's make y follow cos(angle) inverted?
      // When angle=0 (Front), cos=1. Eyes Center.
      // When angle=90 (Right), cos=0. Eyes Right.
      // When angle=180 (Back), cos=-1. Eyes look "back"?? Usually displayed as looking Up or Down.
      // Let's try circular path.
      cyOffset = -R_EYE * Math.cos(angle);
      // At 0(Front): Y = -3 (Look Up? No.)
      // We want at Front(0) -> Y=0.
      // Let's fix phase.
      // We want (0,0) at t=0.
      // Correct orbit visual:
      cyOffset = -2 - 1 * Math.cos(angle);
      // This is tricky without 3D eyes.

      // Simplified:
      // X follows sin(angle).
      // Y follows -cos(angle) (Look up when it's behind).
      cyOffset = -2 + -3 * Math.cos(angle);
      // Front(cos=1) -> -5 (Look way up? No).

      // Let's try normalized tracking vector.
      // Glasses pos: (sin, cos).
      cxOffset = 2.5 * Math.sin(angle);
      cyOffset = -2.5 * Math.cos(angle);
      // t=0 (Front): x=0, y=-2.5 (Looking Up at lifting glasses).
      // t=0.25 (Right): x=2.5, y=0.
      // t=0.5 (Back): x=0, y=2.5 (Looking Down? No, looking "up/over" head).
      // Let's just do a circle.

      // Modify for "Surprised" - maybe pupils shrink?
    } else {
      // Land Phase - return to center
      const t = (val - P_ORBIT) / (1 - P_ORBIT); // 0->1
      // Anim from (0,-2.5) to (0,0)
      cxOffset = 0;
      cyOffset = -2.5 * (1 - t);
    }

    return {
      transform: [{ translateX: cxOffset }, { translateY: cyOffset }],
    };
  });

  // Z-Index derived value for opacity toggle
  const zIndexVal = useDerivedValue(() => {
    const val = progress.value;
    if (val < P_LIFT || val >= P_ORBIT) return 1;
    const t = (val - P_LIFT) / (P_ORBIT - P_LIFT);
    const angle = t * Math.PI * 2;
    return Math.cos(angle) > 0 ? 1 : -1;
  });

  const frontOpacityProps = useAnimatedProps(() => ({
    opacity: zIndexVal.value > 0 ? 1 : 0,
  }));

  const backOpacityProps = useAnimatedProps(() => ({
    opacity: zIndexVal.value < 0 ? 1 : 0,
  }));

  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none" {...props}>
      <Defs>
        <Filter
          id="finish_cool_shadow"
          x="-50%"
          y="-50%"
          width="200%"
          height="200%"
          filterUnits="userSpaceOnUse"
        >
          <FeFlood floodOpacity={0} result="bgFix" />
          <FeColorMatrix
            in="SourceAlpha"
            result="hardAlpha"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
          />
          <FeOffset dx={4} dy={4} />
          <FeGaussianBlur stdDeviation={1} />
          <FeComposite in2="hardAlpha" operator="out" />
          <FeColorMatrix values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
          <FeBlend in2="bgFix" result="sh" />
          <FeBlend in="SourceGraphic" in2="sh" />
        </Filter>
        <Mask id="m">
          <Path
            fill="#fff"
            d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
          />
        </Mask>
      </Defs>
      <G mask="url(#m)">
        {/* Background - Deep Ocean */}
        <Path fill="#01579B" d="M0 0h48v48H0z" />

        {/* DETAILED WORLD MAP BACKGROUND */}
        <G fill="#4CAF50" opacity="0.9">
          <Path d="M2 2 L 12 0 L 18 5 L 14 12 L 8 15 L 2 12 Z" />
          <Path d="M22 1 L 26 0 L 28 4 L 24 6 Z" />
          <Path d="M30 5 L 35 2 L 45 4 L 48 12 L 40 18 L 32 15 Z" />
          <Path d="M42 22 L 48 24 L 46 35 L 40 38 L 38 30 Z" />
          <Path d="M4 35 L 12 38 L 10 48 H 2 Z" />
          <Path d="M38 42 L 44 40 L 46 45 L 42 48 H 36 Z" />
        </G>

        {/* GRID LINES */}
        <Path
          d="M0 24 H 48 M 24 0 V 48"
          stroke="#FFFFFF"
          strokeWidth="0.2"
          opacity="0.3"
        />

        {/* DROPPED FACE STRUCTURE */}
        <G filter="url(#finish_cool_shadow)" transform="translate(0, 6)">
          {/* 1. GLASSES BEHIND */}
          <AnimatedG animatedProps={glassesAnimatedProps}>
            <AnimatedG animatedProps={backOpacityProps}>
              <GlassesGroup />
            </AnimatedG>
          </AnimatedG>

          {/* 2. FACE SKIN */}
          <Path
            fill="#FFE0B2"
            d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
          />

          {/* --- EXCITED EYES (White Sclera + Animated Pupils) --- */}
          {/* Eyes Container */}
          <G>
            {/* Left Eye White */}
            <Circle cx="15" cy="23.5" r="5" fill="#FFF" />
            {/* Left Pupil */}
            <AnimatedG animatedProps={eyesAnimatedProps}>
              <Circle cx="15" cy="23.5" r="2.5" fill="#1A1A1A" />
              <Circle cx="16" cy="22.5" r="0.8" fill="#FFF" />
            </AnimatedG>

            {/* Right Eye White */}
            <Circle cx="33" cy="23.5" r="5" fill="#FFF" />
            {/* Right Pupil */}
            <AnimatedG animatedProps={eyesAnimatedProps}>
              <Circle cx="33" cy="23.5" r="2.5" fill="#1A1A1A" />
              <Circle cx="34" cy="22.5" r="0.8" fill="#FFF" />
            </AnimatedG>
          </G>

          {/* 3. GLASSES FRONT */}
          <AnimatedG animatedProps={glassesAnimatedProps}>
            <AnimatedG animatedProps={frontOpacityProps}>
              <GlassesGroup />
            </AnimatedG>
          </AnimatedG>
        </G>

        {/* TOP FOG / CLOUDS */}
        <Path
          d="M0 0 Q 12 8, 24 0 T 48 0 V 6 Q 24 12, 0 6 Z"
          fill="#FFFFFF"
          opacity="0.4"
        />
      </G>
    </Svg>
  );
};

export default ExcitedTouristMapFace;
