import React, { useEffect } from "react";
import Animated, { useSharedValue, useAnimatedProps, withDelay, withRepeat, withSequence, withTiming, Easing, cancelAnimation } from "react-native-reanimated";
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

  const splashProps1 = useAnimatedProps(() => {
    const s = splash.value;
    return {
      opacity: s > 0 ? 1 - s : 0,
      transform: [
        { translateX: -dir * 12 * s },
        { translateY: -20 * s },
        { scale: 0.5 + 0.8 * s }
      ] as any
    };
  });
  const splashProps2 = useAnimatedProps(() => {
    const s = splash.value;
    return {
      opacity: s > 0 ? 1 - s : 0,
      transform: [
        { translateX: dir * 8 * s },
        { translateY: -28 * s },
        { scale: 0.5 + 0.6 * s }
      ] as any
    };
  });
  const splashProps3 = useAnimatedProps(() => {
    const s = splash.value;
    return {
      opacity: s > 0 ? 1 - s : 0,
      transform: [
        { translateX: -dir * 4 * s },
        { translateY: -15 * s },
        { scale: 0.5 + 0.7 * s }
      ] as any
    };
  });

  const clipId = `beer-clip-${isRight ? 'right' : 'left'}`;

  const Handle = (
    <G transform={isRight ? "" : "scale(-1, 1)"}>
      <Path d="M 8 -2 C 15 -2, 16 8, 8 10" fill="none" stroke="#000" strokeWidth="3" />
      <Path d="M 8 -2 C 15 -2, 16 8, 8 10" fill="none" stroke="#FFC107" strokeWidth="1.5" />
    </G>
  );

  const Foam = (
    <G transform={isRight ? "" : "scale(-1, 1)"}>
      <Path d="M 8 -4 C 10 -9, 5 -11, 3 -9 C 3 -15, -3 -15, -3 -11 C -5 -16, -11 -13, -9 -8 C -14 -8, -14 -2, -10 1 C -12 5, -6 6, -5 3 C -3 6, 1 5, 2 3 C 5 6, 9 2, 8 -4 Z" fill="#FFF" stroke="#000" strokeWidth="1.5" strokeLinejoin="round" />
      <Path d="M 2 -9 Q 1 -6 3 -5" fill="none" stroke="#000" strokeWidth="1" strokeLinecap="round" />
      <Path d="M -3 -11 Q -4 -8 -2 -7" fill="none" stroke="#000" strokeWidth="1" strokeLinecap="round" />
      <Path d="M -8 -8 Q -7 -5 -9 -4" fill="none" stroke="#000" strokeWidth="1" strokeLinecap="round" />
      <Path d="M -10 -1 Q -8 0 -9 2" fill="none" stroke="#000" strokeWidth="1" strokeLinecap="round" />
    </G>
  );

  const Splashes = (
    <>
      <AnimatedG animatedProps={splashProps1}>
        <Circle cx="0" cy="0" r="2" fill="#FFF" stroke="#000" strokeWidth="1" />
      </AnimatedG>
      <AnimatedG animatedProps={splashProps2}>
        <Circle cx="0" cy="0" r="1.5" fill="#FFC107" stroke="#000" strokeWidth="1" />
      </AnimatedG>
      <AnimatedG animatedProps={splashProps3}>
        <Circle cx="0" cy="0" r="2.5" fill="#FFF" stroke="#000" strokeWidth="1" />
      </AnimatedG>
    </>
  );

  return (
    <AnimatedG animatedProps={mugProps}>
      {/* 1. Handle */}
      {Handle}

      {/* 2. Glass Background */}
      <Path d="M -8 -6 L -7 12 Q 0 15 7 12 L 8 -6 Z" fill="#FFF" />

      {/* 3. Liquid */}
      <Defs>
        <ClipPath id={clipId}>
          <Path d="M -7.5 -6 L -6.5 11.5 Q 0 14 6.5 11.5 L 7.5 -6 Z" />
        </ClipPath>
      </Defs>
      <G clipPath={`url(#${clipId})`}>
        <AnimatedG animatedProps={liquidProps}>
          {/* Beer Body */}
          <Rect x="-20" y="-1" width="40" height="25" fill="#FFC107" />
          {/* Internal Foam */}
          <Rect x="-20" y="-3" width="40" height="4" fill="#FFF" />
          <Path d="M -20 -3 L 20 -3" stroke="#000" strokeWidth="1" />
        </AnimatedG>
      </G>

      {/* 4. Glass Outlines & Dimples */}
      <Path d="M -8 -6 L -7 12 Q 0 15 7 12 L 8 -6 Z" fill="none" stroke="#000" strokeWidth="1.5" />
      <Rect x="-5.5" y="-2" width="3" height="11" rx="1.5" fill="none" stroke="#000" strokeWidth="1.2" />
      <Rect x="-1.5" y="-2" width="3" height="11" rx="1.5" fill="none" stroke="#000" strokeWidth="1.2" />
      <Rect x="2.5" y="-2" width="3" height="11" rx="1.5" fill="none" stroke="#000" strokeWidth="1.2" />
      <Path d="M -6.5 12.5 Q 0 15.5 6.5 12.5" fill="none" stroke="#000" strokeWidth="1.5" />

      {/* 5. Foam */}
      {Foam}

      {/* 6. Splashes */}
      {Splashes}
    </AnimatedG>
  );
};

const WithYouFace = (props: SvgIconProps) => (
  <FaceShell bg="#3949AB" {...props}>
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
      
      {/* Clink Sparkles */}
      <Glow cx={0} cy={0} from={0.2} to={1} sc0={0.8} sc1={1.2} dur={1500}>
        <Path d="M 0 -2 L 2 2 L 6 0 L 2 4 L 4 8 L 0 5 L -4 8 L -2 4 L -6 0 L -2 2 Z" fill="#FFEB3B" transform="scale(0.5) translate(0, -6)" />
      </Glow>
    </G>
  </FaceShell>
);

export default React.memo(WithYouFace);
