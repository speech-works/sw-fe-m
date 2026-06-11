import React, { useEffect } from "react";
import Animated, { useSharedValue, useAnimatedProps, withDelay, withRepeat, withSequence, withTiming, Easing, cancelAnimation } from "react-native-reanimated";
import { LinearGradient, Stop } from "react-native-svg";
import { FaceShell, Glow, SvgIconProps, Path, G, Rect, Circle, Defs, ClipPath, AnimatedG } from "./faceKit";

const BeerMug = ({ isRight, sa }: { isRight: boolean; sa: boolean }) => {
  const t = useSharedValue(0);
  const splash = useSharedValue(0);

  useEffect(() => {
    if (sa) {
      t.value = withDelay(500, withRepeat(
        withSequence(
          withTiming(0, { duration: 2000 }),
          withTiming(-0.3, { duration: 600, easing: Easing.inOut(Easing.quad) }), // Pull back
          withTiming(1, { duration: 200, easing: Easing.out(Easing.cubic) }),   // Clink!
          withTiming(0, { duration: 500, easing: Easing.out(Easing.back(1.5)) }) // Bounce back
        ), -1, false
      ));

      splash.value = withDelay(500, withRepeat(
        withSequence(
          withTiming(0, { duration: 2600 }), // Wait for pull back & clink
          withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) }), // Explode
          withTiming(1, { duration: 400 }), // Wait
          withTiming(0, { duration: 0 })    // Reset
        ), -1, false
      ));
    } else {
      t.value = 0;
      splash.value = 0;
    }
    return () => { cancelAnimation(t); cancelAnimation(splash); };
  }, [sa]);

  const dir = isRight ? -1 : 1;

  const mugProps = useAnimatedProps(() => ({
    transform: [
      { rotate: `${dir * 12 * t.value}deg` },
      { translateX: dir * 7 * t.value },
      { translateY: -2 * t.value }
    ] as any
  }));

  const liquidProps = useAnimatedProps(() => {
    const initialCounter = -dir * 10;
    const dynamicCounter = -dir * 12 * t.value; 
    const slosh = -dir * 15 * Math.max(0, t.value); 
    const finalRotation = initialCounter + dynamicCounter + slosh;
    return {
      transform: [
        { translateY: -1 - 3 * Math.max(0, t.value) },
        { rotate: `${finalRotation}deg` },
      ] as any
    };
  });

  const foamProps = useAnimatedProps(() => {
    const pull = Math.min(0, t.value);
    const clink = Math.max(0, t.value);

    return {
      transform: [
        { translateX: -2 * clink },
        { translateY: 3 * clink },
        { scaleX: 1 + 0.1 * clink },
        { scaleY: 1 + 0.1 * clink },
        { skewX: `${10 * pull}deg` }
      ] as any
    };
  });

  const sparkProps1 = useAnimatedProps(() => {
    const s = splash.value;
    return {
      opacity: s > 0 ? 1 - s : 0,
      transform: [
        { translateX: -10 * s },
        { translateY: -10 * s },
        { scale: 0.5 + 0.5 * s }
      ] as any
    };
  });
  const sparkProps2 = useAnimatedProps(() => {
    const s = splash.value;
    return {
      opacity: s > 0 ? 1 - s : 0,
      transform: [
        { translateY: -15 * s },
        { scale: 0.5 + 0.5 * s }
      ] as any
    };
  });
  const sparkProps3 = useAnimatedProps(() => {
    const s = splash.value;
    return {
      opacity: s > 0 ? 1 - s : 0,
      transform: [
        { translateX: 10 * s },
        { translateY: -10 * s },
        { scale: 0.5 + 0.5 * s }
      ] as any
    };
  });

  const clipId = `beer-clip-${isRight ? 'right' : 'left'}`;

  const Handle = (
    <G transform={isRight ? "" : "scale(-1, 1)"}>
      <Path d="M 7 -1 L 11 -1 A 2.5 2.5 0 0 1 13.5 1.5 L 13.5 7 A 2.5 2.5 0 0 1 11 9.5 L 7 9.5" fill="none" stroke="#90A4AE" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M 7 -1 L 11 -1 A 2.5 2.5 0 0 1 13.5 1.5 L 13.5 7 A 2.5 2.5 0 0 1 11 9.5 L 7 9.5" fill="none" stroke="#CFD8DC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </G>
  );

  const Foam = (
    <G transform={isRight ? "" : "scale(-1, 1)"}>
      <AnimatedG animatedProps={foamProps}>
        {/* Soft, smooth single-blob foam */}
        <Path d="M 9 -4 
                 C 9 -11, -5 -11, -7 -6
                 C -13 -6, -13 3, -8 2
                 C -5 1.5, -4 -1, -2 -2
                 C 1 -1, 4 -1, 5 -2
                 C 7 -1, 9 -1, 9 -4 Z" 
              fill="url(#foamShade)" />
      </AnimatedG>
    </G>
  );

  return (
    <>
      <AnimatedG animatedProps={mugProps}>
        {/* 1. Handle */}
        {Handle}

        {/* 2. Glass Backing */}
        <Path d="M -9 -6 L 9 -6 L 8 11 L -8 11 Z" fill="url(#glassGlare)" opacity="0.3" />
        
        {/* 3. Liquid */}
        <ClipPath id={clipId}>
          <Path d="M -8.5 -6 L 8.5 -6 L 7.5 11 L -7.5 11 Z" />
        </ClipPath>
        <G clipPath={`url(#${clipId})`}>
          <AnimatedG animatedProps={liquidProps}>
            {/* Beer Gradient Body */}
            <Rect x="-20" y="-1" width="40" height="25" fill="url(#beerGrad)" />
            {/* Soft bubbles inside */}
            <Circle cx="-4" cy="2" r="1.2" fill="#FFF" opacity="0.5" />
            <Circle cx="3" cy="5" r="1.5" fill="#FFF" opacity="0.4" />
            <Circle cx="-6" cy="8" r="0.8" fill="#FFF" opacity="0.6" />
            <Circle cx="2" cy="1" r="1.2" fill="#FFF" opacity="0.5" />
            {/* Internal Foam Layer */}
            <Rect x="-20" y="-3" width="40" height="4" fill="#FFFFFF" opacity="0.8" />
          </AnimatedG>
        </G>

        {/* 4. Glass Glare / Reflections */}
        <Path d="M -7.5 -6 L -2.5 -6 L -3.5 11 L -6.5 11 Z" fill="#FFF" opacity="0.4" />
        <Path d="M 6.5 -6 L 8.5 -6 L 7.5 11 L 6 11 Z" fill="#FFF" opacity="0.2" />

        {/* 5. Top Rim */}
        <Path d="M -9 -6 L 9 -6 L 9 -3 L -9 -3 Z" fill="url(#glassRim)" opacity="0.6" />
        
        {/* 6. Thick Glass Base */}
        <Path d="M -8.5 11 L 8.5 11 A 2 2 0 0 1 8.5 15 L -8.5 15 A 2 2 0 0 1 -8.5 11 Z" fill="url(#glassRim)" />
        <Path d="M -8 13 L 8 13" stroke="#78909C" strokeWidth="1" />

        {/* 7. Foam */}
        {Foam}
      </AnimatedG>
      
      {/* 8. Sparks (rendered above everything, outside the mug rotation) */}
      {isRight && (
        <G transform="translate(-8, -12)">
          <AnimatedG animatedProps={sparkProps1}>
             <Path d="M -4 -8 L -10 -18 L -2 -14 Z" fill="#FF3D00" />
          </AnimatedG>
          <AnimatedG animatedProps={sparkProps2}>
             <Path d="M 0 -10 L -2 -20 L 4 -18 Z" fill="#FF6D00" />
          </AnimatedG>
          <AnimatedG animatedProps={sparkProps3}>
             <Path d="M 4 -8 L 12 -14 L 6 -18 Z" fill="#FF3D00" />
          </AnimatedG>
        </G>
      )}
    </>
  );
};

const WithYouFace = (props: SvgIconProps) => (
  <FaceShell bg="#3949AB" {...props}>
    <Defs>
      <LinearGradient id="beerGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <Stop offset="0%" stopColor="#FFD54F" />
        <Stop offset="50%" stopColor="#FF8F00" />
        <Stop offset="100%" stopColor="#E65100" />
      </LinearGradient>
      <LinearGradient id="glassRim" x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0%" stopColor="#B0BEC5" />
        <Stop offset="30%" stopColor="#ECEFF1" />
        <Stop offset="80%" stopColor="#90A4AE" />
        <Stop offset="100%" stopColor="#78909C" />
      </LinearGradient>
      <LinearGradient id="foamShade" x1="0%" y1="0%" x2="0%" y2="100%">
        <Stop offset="40%" stopColor="#FFFFFF" />
        <Stop offset="100%" stopColor="#E0E0E0" />
      </LinearGradient>
      <LinearGradient id="glassGlare" x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.8" />
        <Stop offset="30%" stopColor="#FFFFFF" stopOpacity="0.1" />
        <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
      </LinearGradient>
    </Defs>
    <G transform="translate(24, 24)">
      {/* Background Sparkles */}
      <Glow cx={0} cy={0} from={0.4} to={0.8} dur={4000}>
        <Path d="M -8 -15 Q -10 -21 -6 -25" fill="none" stroke="#FFF" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
        <Path d="M -2 -13 Q 0 -19 -4 -23" fill="none" stroke="#FFF" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
        <Path d="M 6 -15 Q 8 -21 4 -25" fill="none" stroke="#FFF" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
      </Glow>

      {/* Left Beer Mug */}
      <G transform="translate(-8, 6) rotate(10)">
        <BeerMug isRight={false} sa={!!props.shouldAnimate} />
      </G>

      {/* Right Beer Mug */}
      <G transform="translate(8, 6) rotate(-10)">
        <BeerMug isRight={true} sa={!!props.shouldAnimate} />
      </G>
    </G>
  </FaceShell>
);

export default React.memo(WithYouFace);
