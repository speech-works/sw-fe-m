import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, {
    useAnimatedProps,
    useDerivedValue,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming,
    withDelay,
    cancelAnimation,
    Easing
} from "react-native-reanimated";
import Svg, {
    Circle,
    G,
    Path,
    SvgProps
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

const SKIN_COLOR = "#FFDABF";
const INK_COLOR = "#111215";
const FACE_PATH = "M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736";

const GliderFace = ({
  size = 48,
  width,
  height,
  shouldAnimate = false,
  transparentBg = false,
  ...props
}: SvgIconProps) => {
  const activeWidth = width || size;
  const activeHeight = height || size;

  const glideProgress = useSharedValue(0);
  const blink = useSharedValue(1);

  useEffect(() => {
    if (shouldAnimate) {
      glideProgress.value = withRepeat(
        withTiming(1, { duration: 3000, easing: Easing.linear }),
        -1,
        false
      );
      blink.value = withRepeat(
        withSequence(
          withDelay(
            Math.random() * 3000 + 1000,
            withTiming(0.1, { duration: 100 })
          ),
          withTiming(1, { duration: 100 })
        ),
        -1,
        false
      );
    } else {
      glideProgress.value = 0;
      blink.value = 1;
    }

    return () => {
      cancelAnimation(glideProgress);
      cancelAnimation(blink);
    };
  }, [shouldAnimate]);

  const glideProps = useAnimatedProps(() => {
    // If not animating, show it at a fixed "gliding" position in the middle
    const progress = shouldAnimate ? glideProgress.value : 0.4;
    
    // Shifted flight path to the top area to avoid eyes (cy=24)
    const tx = -10 + progress * 35; // Range: -10 to 25
    const ty = 10 - progress * 8;   // Range: 10 to 2 (well above eyes)
    
    // Only apply fade-in/out during animation
    const visibility = shouldAnimate 
      ? (progress < 0.1 ? progress * 10 : progress > 0.9 ? (1 - progress) * 10 : 1)
      : 1;

    return {
      transform: [
        { translateX: tx }, 
        { translateY: ty },
        { scale: 1.4 } // Increased size
      ] as any,
      opacity: visibility,
    };
  });

  const eyeProps = useAnimatedProps(() => ({
    transform: [{ scaleY: blink.value }] as any,
    originY: 24,
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
        {!transparentBg && (
          <Circle cx="24" cy="24" r="24" fill="#84CC16" />
        )}

        <Path d={FACE_PATH} fill="black" opacity={0.15} transform="translate(1, 1)" />
        <Path d={FACE_PATH} fill={SKIN_COLOR} />

        <AnimatedG animatedProps={eyeProps}>
          <Circle cx="16" cy="24" r="2.5" fill={INK_COLOR} />
          <Circle cx="32" cy="24" r="2.5" fill={INK_COLOR} />
        </AnimatedG>

        {/* Relaxed Smile */}
        <Path 
          d="M 20 36 Q 24 38 28 36" 
          fill="none" 
          stroke={INK_COLOR} 
          strokeWidth="2.5" 
          strokeLinecap="round" 
        />

        {/* Geometric Paper Airplane Gliding */}
        <AnimatedG animatedProps={glideProps}>
          {/* Gliding trail */}
          <Path 
            d="M -8 20 Q 0 20 4 14" 
            fill="none" 
            stroke="#D9F99D" 
            strokeWidth="1.5" 
            strokeDasharray="3 3" 
            opacity={0.6} 
          />
          {/* Airplane Body */}
          <Path 
            d="M 4 14 L 14 10 L 8 18 Z M 14 10 L 10 16 L 16 16 Z" 
            fill="#FFFFFF" 
            opacity={1.0} 
          />
        </AnimatedG>
      </Svg>
    </View>
  );
};

export default React.memo(GliderFace);
