import React, { useEffect, useState } from "react";
import { View } from "react-native";
import Svg, { Circle, G, Path, Rect, SvgProps } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  withDelay,
  runOnJS,
} from "react-native-reanimated";

const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type ProfessionalRole = "doctor" | "teacher" | "engineer" | "student";
type BackgroundStyle = "ocean" | "sunset" | "sky" | "forest" | "city" | "space";

interface CommunityProps extends SvgProps {
  size?: number | string;
  width?: number | string;
  height?: number | string;
  roles?: ProfessionalRole[]; // Pass 4 roles to shuffle
  bgType?: BackgroundStyle;
  shouldAnimate?: boolean;
}

const SCENE_ORDER: BackgroundStyle[] = [
  "city",
  "forest",
  "sky",
  "ocean",
  "sunset",
  "space",
];

const getBgColor = (type: BackgroundStyle) => {
  switch (type) {
    case "ocean":
      return "#0EA5E9"; // Blue
    case "sunset":
      return "#F97316"; // Orange
    case "sky":
      return "#BAE6FD"; // Light Blue
    case "forest":
      return "#22C55E"; // Green
    case "city":
      return "#94A3B8"; // Gray
    case "space":
      return "#1E1B4B"; // Dark Indigo
    default:
      return "#BAE6FD";
  }
};

const BackgroundOverlay = ({ type }: { type: BackgroundStyle }) => {
  switch (type) {
    case "ocean":
      return (
        <G opacity={1}>
          {/* Sky Gradient / Background */}
          <Rect width="48" height="20" fill="#E0F2FE" opacity={0.3} />
          {/* Lighthouse on Rock (Left) */}
          <Path d="M0 48 L 10 30 L 14 30 L 12 48" fill="#57534E" />
          {/* Concrete Lighthouse Tower - White with Red Stripes */}
          <Path d="M4 30 L 7 10 L 9 10 L 12 30 Z" fill="#F8FAFC" />
          <Path d="M4.5 25 H 11.5 L 11 22 H 5 Z" fill="#DC2626" />
          <Path d="M5.5 18 H 10.5 L 10 15 H 6 Z" fill="#DC2626" />
          {/* Lantern Room */}
          <Rect
            x="6"
            y="7"
            width="4"
            height="3"
            fill="#FEF3C7"
            stroke="#334155"
            strokeWidth="0.5"
          />
          <Path d="M6 7 L 8 4 L 10 7" fill="#334155" />

          {/* Sailboat (Right) */}
          <Path
            d="M36 28 L 36 12 L 44 24 Z"
            fill="#F8FAFC"
            stroke="#CBD5E1"
            strokeWidth="0.5"
          />
          <Path
            d="M36 28 L 36 15 L 30 24 Z"
            fill="#E2E8F0"
            stroke="#CBD5E1"
            strokeWidth="0.5"
          />
          {/* Hull - Wood */}
          <Path d="M30 28 L 32 32 H 42 L 44 28" fill="#7c2d12" />
          {/* Organic Waves - Deep Blues */}
          <Path
            d="M0 32 C 10 30, 15 35, 24 32 C 33 29, 38 34, 48 32 V 48 H 0 Z"
            fill="#0369A1"
            opacity={0.8}
          />
          <Path
            d="M0 40 C 8 38, 12 42, 20 40 C 28 38, 35 42, 48 40 V 48 H 0 Z"
            fill="#0C4A6E"
            opacity={0.9}
          />
        </G>
      );
    case "sunset":
      return (
        <G opacity={1}>
          {/* Sun in the valley - Setting */}
          <Circle cx="24" cy="20" r="8" fill="#F97316" opacity={0.9} />
          <Circle cx="24" cy="20" r="5" fill="#FDBA74" opacity={0.6} />
          {/* Tall Sandhills (Big & Clear above faces) */}
          {/* Left Big Hill */}
          <Path d="M0 48 V 10 Q 12 5, 20 25 L 24 30 L 0 48 Z" fill="#C2410C" />
          {/* Right Big Hill */}
          <Path
            d="M48 48 V 8 Q 36 4, 28 25 L 24 30 L 48 48 Z"
            fill="#EA580C"
            opacity={0.9}
          />
          {/* Foreground Dune Details */}
          <Path
            d="M-5 48 L 15 35 Q 24 40, 33 35 L 50 48 Z"
            fill="#7C2D12"
            opacity={0.7}
          />
        </G>
      );
    case "sky":
      return (
        <G opacity={1}>
          {/* Rainbow Backdrop - Subtle */}
          <Path
            d="M0 48 Q 24 10, 48 48"
            fill="none"
            stroke="#FCA5A5"
            strokeWidth="8"
            opacity={0.2}
          />
          <Path
            d="M0 48 Q 24 16, 48 48"
            fill="none"
            stroke="#FDE047"
            strokeWidth="6"
            opacity={0.2}
          />
          <Path
            d="M0 48 Q 24 22, 48 48"
            fill="none"
            stroke="#BAE6FD"
            strokeWidth="4"
            opacity={0.2}
          />
          {/* Hot Air Balloon - Natural Colors */}
          <Circle cx="38" cy="12" r="5" fill="#EF4444" />
          <Path d="M38 12 L 38 7" stroke="#FDE047" strokeWidth="1" />
          <Path
            d="M34 12 Q 38 18, 42 12"
            fill="none"
            stroke="#2563EB"
            strokeWidth="0.5"
          />
          <Rect x="36.5" y="18" width="3" height="2" fill="#D97706" />
          <Path
            d="M36.5 18 L 34 15 M 39.5 18 L 42 15"
            stroke="#78350F"
            strokeWidth="0.5"
          />
          {/* Fluffy Clouds - Proper Bezier Shapes */}
          <Path
            d="M4 12 C 4 12, 6 8, 10 8 C 14 8, 16 6, 20 10 C 22 8, 26 10, 24 14 H 4 Z"
            fill="#F8FAFC"
            opacity={0.9}
          />
          <Path
            d="M28 8 C 28 8, 30 4, 34 4 C 38 4, 40 2, 44 6 C 46 4, 48 6, 48 10 H 28 Z"
            fill="#F8FAFC"
            opacity={0.8}
          />
        </G>
      );
    case "forest":
      return (
        <G opacity={1}>
          {/* Distant Mountain Peak - Rocky */}
          <Path d="M15 48 L 24 15 L 33 48" fill="#475569" opacity={0.6} />
          {/* Dense Tall Trees - Back Layer (Darkest) */}
          <Path d="M-4 48 L 2 5 L 8 48 Z" fill="#064E3B" />
          <Path d="M4 48 L 10 0 L 16 48 Z" fill="#064E3B" />
          <Path d="M14 48 L 20 8 L 26 48 Z" fill="#064E3B" />
          <Path d="M24 48 L 30 2 L 36 48 Z" fill="#064E3B" />
          <Path d="M34 48 L 40 6 L 46 48 Z" fill="#064E3B" />
          <Path d="M44 48 L 50 0 L 56 48 Z" fill="#064E3B" />
          {/* Mid Layer Trees */}
          <Path d="M0 48 L 6 15 L 12 48 Z" fill="#14532D" opacity={0.8} />
          <Path d="M38 48 L 44 12 L 50 48 Z" fill="#14532D" opacity={0.8} />
          {/* Moon/Sun filtering through top */}
          <Circle cx="24" cy="5" r="3" fill="#FEF9C3" opacity={0.5} />
        </G>
      );
    case "city":
      return (
        <G opacity={1}>
          {/* Moon - High up */}
          <Circle cx="8" cy="8" r="4" fill="#FEF08A" opacity={0.8} />
          {/* Arkham Style Skyscrapers - Tall, Ominous, Gothic */}
          <Path
            d="M0 48 V 10 H 6 V 15 H 10 V 5 H 18 V 12 H 24 V 2 H 30 V 8 H 38 V 4 H 44 V 10 H 48 V 48"
            fill="#0F172A"
          />
          {/* Sparse Lit Windows / Warning Lights */}
          <Rect x="2" y="12" width="1" height="1" fill="#FDBA74" />
          <Rect x="4" y="14" width="1" height="1" fill="#FDBA74" />
          <Rect x="12" y="6" width="1" height="2" fill="#FDBA74" />
          <Rect x="14" y="8" width="1" height="1" fill="#FDBA74" />
          <Rect
            x="26"
            y="4"
            width="2"
            height="1"
            fill="#EF4444"
            opacity={0.8}
          />
          {/* Red Light */}
          <Rect x="32" y="10" width="1" height="1" fill="#FDBA74" />
          <Rect x="34" y="12" width="1" height="1" fill="#FDBA74" />
          <Rect x="40" y="6" width="1" height="2" fill="#FDBA74" />
        </G>
      );
    case "space":
      return (
        <G opacity={1}>
          {/* Rocket Ship - Glossy White */}
          <Path d="M10 25 L 10 15 Q 12 10, 14 15 L 14 25 Z" fill="#F8FAFC" />
          <Path d="M8 25 L 10 20 L 10 25 Z" fill="#DC2626" />
          <Path d="M14 25 L 14 20 L 16 25 Z" fill="#DC2626" />
          <Path d="M10 25 H 14 L 12 28 Z" fill="#F97316" />
          <Circle cx="12" cy="18" r="1.5" fill="#38BDF8" />
          {/* Planet with Rings (Jupiter/Saturn style) */}
          {/* Back Ring Segment */}
          <Path
            d="M26 10 C 26 10, 38 2, 50 10"
            stroke="#FCA5A5"
            strokeWidth="2"
            fill="none"
            opacity={0.6}
          />
          {/* Planet Body */}
          <Circle cx="38" cy="10" r="5" fill="#D4D4D8" />
          {/* Front Ring Segment */}
          <Path
            d="M26 10 C 26 10, 38 18, 50 10"
            stroke="#FCA5A5"
            strokeWidth="2"
            fill="none"
            opacity={0.9}
          />
          {/* Stars */}
          <Circle cx="20" cy="5" r="0.8" fill="#FFF" />
          <Circle cx="45" cy="25" r="0.8" fill="#FFF" />
          <Circle cx="5" cy="40" r="0.8" fill="#FFF" />
        </G>
      );
    default:
      return null;
  }
};
const FaceNode = ({
  faceColor,
  role,
  x,
  y,
  scale = 0.5,
  shadowId,
  shouldAnimate,
}: {
  faceColor: string;
  role: ProfessionalRole;
  x: number;
  y: number;
  scale?: number;
  shadowId: string;
  shouldAnimate?: boolean;
}) => {
  const blink = useSharedValue(1);
  const helmetWiggle = useSharedValue(0);
  const capFloat = useSharedValue(0);
  const glassesTilt = useSharedValue(0);

  React.useEffect(() => {
    if (!shouldAnimate) {
      blink.value = 1;
      helmetWiggle.value = 0;
      capFloat.value = 0;
      glassesTilt.value = 0;
      return;
    }

    // Random Blink
    const blinkDuration = Math.random() * 2000 + 3000;
    blink.value = withRepeat(
      withSequence(
        withDelay(
          blinkDuration,
          withTiming(0.1, { duration: 150 }), // Close
        ),
        withTiming(1, { duration: 150 }), // Open
      ),
      -1,
      false,
    );

    // Engineer Helmet Wiggle
    if (role === "engineer") {
      helmetWiggle.value = withRepeat(
        withSequence(
          withTiming(-2, { duration: 200 }),
          withTiming(2, { duration: 200 }),
          withTiming(0, { duration: 200 }),
          withDelay(2000, withTiming(0, { duration: 0 })),
        ),
        -1,
        false,
      );
    }

    // Student Cap Float
    if (role === "student") {
      capFloat.value = withRepeat(
        withSequence(
          withTiming(-1, { duration: 2000, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        true,
      );
    }

    // Doctor Glasses Tilt
    if (role === "doctor") {
      glassesTilt.value = withRepeat(
        withSequence(
          withTiming(-2, { duration: 1000 }),
          withTiming(2, { duration: 1000 }),
        ),
        -1,
        true,
      );
    }
  }, [shouldAnimate, role]);

  const eyeProps = useAnimatedProps(() => ({
    // Pivot around Y=24 for blinking
    transform: [
      { translateY: 24 },
      { scaleY: blink.value },
      { translateY: -24 },
    ] as any,
  }));

  const helmetProps = useAnimatedProps(() => ({
    transform: [{ rotate: `${helmetWiggle.value}deg` }] as any,
    originX: 24,
    originY: 24,
  }));

  const capProps = useAnimatedProps(() => ({
    // Apply float. Base position is handled by static transform on parent or G if needed.
    // Since cap has static translate(0, -2), we add float to translateY.
    // Original static was translate(0, -2), so translateY should be related to that if we replace it?
    // Actually, animatedProps transform overrides static transform on Animated components usually.
    // We should include the static offset (-2) in the animated value or prop.
    transform: [{ translateY: -2 + capFloat.value }] as any,
  }));

  const glassesProps = useAnimatedProps(() => ({
    transform: [{ rotate: `${glassesTilt.value}deg` }] as any,
    originX: 24,
    originY: 24,
  }));

  return (
    <G transform={`translate(${x}, ${y}) scale(${scale})`}>
      {/* Shadow - Vector approximation */}
      <Path
        fill="#000000"
        opacity={0.25}
        d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
        transform="translate(1, 1)"
      />
      {/* Face Shape */}
      <Path
        fill={faceColor}
        d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
      />

      {/* PROPS */}
      {role === "engineer" && (
        <G transform="translate(0, -8)">
          <AnimatedG animatedProps={helmetProps}>
            <Path
              fill="#FBBF24"
              d="M3 18 Q 24.5 -6, 46 18 L 47 22 Q 24.5 17, 2 22 Z"
            />
            <Path
              d="M20 5 Q 24.5 0, 29 5 L 29 18 Q 24.5 14, 20 18 Z"
              fill="#D97706"
              opacity="0.8"
            />
          </AnimatedG>
        </G>
      )}

      {role === "doctor" && (
        <G transform="translate(0, 8)">
          <Path
            d="M8 1 Q 24.5 -2, 41 1 L 41 6 Q 24.5 3, 8 6 Z"
            fill="#334155"
          />
          <Circle
            cx="24.5"
            cy="1"
            r="6"
            fill="#94A3B8"
            stroke="#F1F5F9"
            strokeWidth="1"
          />
        </G>
      )}

      {role === "student" && (
        <AnimatedG animatedProps={capProps}>
          <Path fill="#1E293B" d="M2 11 L 24.5 1 L 47 11 L 24.5 21 Z" />
          <Path fill="#0F172A" d="M10 12 V 17 Q 24.5 21, 39 17 V 12 Z" />
        </AnimatedG>
      )}

      {/* EYES */}
      <AnimatedG transform="translate(0.5, 0)" animatedProps={eyeProps}>
        <Circle cx="15.5" cy="24" r="4.2" fill="#FFF" />
        <Circle cx="15.5" cy="24" r="2.2" fill="#111215" />
        <Circle cx="16.5" cy="23" r="0.8" fill="#FFF" opacity="0.8" />
        <Circle cx="32.5" cy="24" r="4.2" fill="#FFF" />
        <Circle cx="32.5" cy="24" r="2.2" fill="#111215" />
        <Circle cx="33.5" cy="23" r="0.8" fill="#FFF" opacity="0.8" />
      </AnimatedG>

      {role === "doctor" && (
        <AnimatedG transform="translate(0.5, 0)" animatedProps={glassesProps}>
          <Circle
            cx="15.5"
            cy="24"
            r="5"
            stroke="#334155"
            strokeWidth="1"
            fill="none"
          />
          <Circle
            cx="32.5"
            cy="24"
            r="5"
            stroke="#334155"
            strokeWidth="1"
            fill="none"
          />
          <Path
            d="M20.5 24 H 27.5"
            stroke="#334155"
            strokeWidth="1"
            fill="none"
          />
        </AnimatedG>
      )}

      {role === "teacher" && (
        <G transform="translate(0.5, 0)">
          <Path fill="#1A1A1A" d="M9.5 20 H 21.5 V 23 Q 15.5 24, 9.5 23 Z" />
          <Path fill="#1A1A1A" d="M26.5 20 H 38.5 V 23 Q 32.5 24, 26.5 23 Z" />
          <Path
            d="M9.5 23 Q 9.5 30, 21.5 30 Q 21.5 23, 21.5 23"
            stroke="#111215"
            strokeWidth="1"
            fill="#111215"
            fillOpacity="0.1"
          />
          <Path
            d="M26.5 23 Q 26.5 30, 38.5 30 Q 38.5 23, 38.5 23"
            stroke="#111215"
            strokeWidth="1"
            fill="#111215"
            fillOpacity="0.1"
          />
        </G>
      )}

      <Path
        stroke="#111215"
        strokeWidth="2.5"
        strokeLinecap="round"
        d="M18.5 36 Q 24.5 39, 30.5 36"
        fill="none"
      />
    </G>
  );
};

const FacesLayer = ({
  roles,
  shouldAnimate,
}: {
  roles: ProfessionalRole[];
  shouldAnimate?: boolean;
}) => {
  const shadowId = "global_shadow";
  return (
    <G>
      <FaceNode
        faceColor="#5C3D2E"
        role={roles[0]}
        x={12}
        y={8}
        scale={0.5}
        shadowId={shadowId}
        shouldAnimate={shouldAnimate}
      />
      <FaceNode
        faceColor="#A16207"
        role={roles[1]}
        x={0}
        y={18}
        scale={0.55}
        shadowId={shadowId}
        shouldAnimate={shouldAnimate}
      />
      <FaceNode
        faceColor="#D97706"
        role={roles[2]}
        x={24}
        y={18}
        scale={0.55}
        shadowId={shadowId}
        shouldAnimate={shouldAnimate}
      />
      <FaceNode
        faceColor="#FFDABF"
        role={roles[3]}
        x={10}
        y={28}
        scale={0.6}
        shadowId={shadowId}
        shouldAnimate={shouldAnimate}
      />
    </G>
  );
};

const BackgroundLayer = ({ type }: { type: BackgroundStyle }) => {
  return (
    <G>
      <Rect width="48" height="48" fill={getBgColor(type)} />
      <BackgroundOverlay type={type} />
    </G>
  );
};

const DiverseCommunityFace = ({
  size = 150,
  width,
  height,
  roles = ["teacher", "doctor", "engineer", "student"],
  bgType = "city", // Initial BG
  shouldAnimate,
  ...props
}: CommunityProps) => {
  const activeWidth = width || size;
  const activeHeight = height || size;
  // State
  const [activeIndex, setActiveIndex] = React.useState(() => {
    const idx = SCENE_ORDER.indexOf(bgType);
    return idx === -1 ? 0 : idx;
  });

  const slideOffset = useSharedValue(0);

  React.useEffect(() => {
    if (!shouldAnimate) return;

    const interval = setInterval(() => {
      // 1. Animate Slide (0 -> 48)
      //    Vertical Slide UP
      //    Current: 0 -> -48 (Moves UP out of view)
      //    Next: 48 -> 0 (Moves UP into view from bottom)
      slideOffset.value = withTiming(
        48,
        { duration: 1000, easing: Easing.bezier(0.33, 1, 0.68, 1) },
        (finished) => {
          if (finished) {
            runOnJS(handleNextScene)();
          }
        },
      );
    }, 4000); // 3s wait + 1s anim

    return () => clearInterval(interval);
  }, [shouldAnimate]);

  const handleNextScene = () => {
    setActiveIndex((prev) => (prev + 1) % SCENE_ORDER.length);
    slideOffset.value = 0; // Reset
  };

  const currentScene = SCENE_ORDER[activeIndex];
  const nextScene = SCENE_ORDER[(activeIndex + 1) % SCENE_ORDER.length];

  const currentBgStyle = useAnimatedProps(() => ({
    transform: [{ translateY: -slideOffset.value }] as any,
  }));

  const nextBgStyle = useAnimatedProps(() => ({
    transform: [{ translateY: 48 - slideOffset.value }] as any,
  }));

  return (
    <View
      style={{
        width: activeWidth as any,
        height: activeHeight as any,
        borderRadius: (typeof activeWidth === "number" ? activeWidth : 150) / 2,
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
        <G>
          {/* Background Vertical Slider */}
          <AnimatedG animatedProps={currentBgStyle}>
            <BackgroundLayer type={currentScene} />
          </AnimatedG>
          <AnimatedG animatedProps={nextBgStyle}>
            <BackgroundLayer type={nextScene} />
          </AnimatedG>

          {/* Static Faces on Top */}
          <FacesLayer roles={roles} shouldAnimate={shouldAnimate} />
        </G>
      </Svg>
    </View>
  );
};

const CommunityGallery = () => {
  return (
    <View
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
        padding: 20,
      }}
    >
      {/* Variant 1: Ocean BG */}
      <DiverseCommunityFace
        bgType="ocean"
        roles={["teacher", "doctor", "engineer", "student"]}
      />
      {/* Variant 2: Sunset BG */}
      <DiverseCommunityFace
        bgType="sunset"
        roles={["student", "engineer", "doctor", "teacher"]}
      />
      {/* Variant 3: Sky BG */}
      <DiverseCommunityFace
        bgType="sky"
        roles={["doctor", "student", "teacher", "engineer"]}
      />
      {/* Variant 4: Forest BG */}
      <DiverseCommunityFace
        bgType="forest"
        roles={["engineer", "teacher", "student", "doctor"]}
      />
      {/* Variant 5: City BG */}
      <DiverseCommunityFace
        bgType="city"
        roles={["teacher", "student", "engineer", "doctor"]}
      />
      {/* Variant 6: Space BG */}
      <DiverseCommunityFace
        bgType="space"
        roles={["student", "doctor", "engineer", "teacher"]}
      />
    </View>
  );
};

export default React.memo(DiverseCommunityFace);
