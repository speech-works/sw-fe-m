import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, {
    useAnimatedProps,
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
    Text,
    Defs,
    LinearGradient,
    Stop,
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

const LetterOFace = ({
  size = 48,
  width,
  height,
  shouldAnimate = false,
  transparentBg = false,
  ...props
}: SvgIconProps) => {
  const activeWidth = width || size;
  const activeHeight = height || size;

  const floatAnim = useSharedValue(0);
  const blink = useSharedValue(1);

  useEffect(() => {
    if (shouldAnimate) {
      floatAnim.value = withRepeat(
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
      blink.value = withRepeat(
        withSequence(
          withDelay(
            Math.random() * 4000 + 1000,
            withTiming(0.1, { duration: 100 })
          ),
          withTiming(1, { duration: 100 })
        ),
        -1,
        false
      );
    } else {
      floatAnim.value = 0;
      blink.value = 1;
    }

    return () => {
      cancelAnimation(floatAnim);
      cancelAnimation(blink);
    };
  }, [shouldAnimate]);

  const monocleProps = useAnimatedProps(() => ({
    transform: [{ translateY: floatAnim.value * -1.5 }] as any,
  }));

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
        <Defs>
          <LinearGradient id="shinyBlueGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#60A5FA" />
            <Stop offset="50%" stopColor="#1D4ED8" />
            <Stop offset="100%" stopColor="#1E40AF" />
          </LinearGradient>
        </Defs>

        {!transparentBg && (
          <Circle cx="24" cy="24" r="24" fill="#F0F9FF" />
        )}

        <Path d={FACE_PATH} fill="black" opacity={0.1} transform="translate(1, 1)" />
        <Path d={FACE_PATH} fill={SKIN_COLOR} />

        <AnimatedG animatedProps={eyeProps}>
          {/* Left Eye */}
          <Circle cx="16" cy="24" r="2" fill={INK_COLOR} />
          {/* Right Eye (behind monocle) */}
          <Circle cx="32" cy="24" r="2" fill={INK_COLOR} />
        </AnimatedG>

        {/* Mouth */}
        <Path 
          d="M 20 34 Q 24 36 28 34" 
          stroke={INK_COLOR} 
          strokeWidth="1.2" 
          fill="none" 
          strokeLinecap="round" 
        />

        {/* 'O' Monocle Prop */}
        <AnimatedG animatedProps={monocleProps}>
          {/* The Gallery/Handle */}
          <Path 
            d="M 38 28 L 44 40" 
            stroke="url(#shinyBlueGradient)" 
            strokeWidth="1.8" 
            strokeLinecap="round" 
          />
          
          {/* The Lens (Glass Effect) */}
          <Circle 
            cx="32" 
            cy="24" 
            r="8.5" 
            fill="rgba(255, 255, 255, 0.2)" 
            stroke="url(#shinyBlueGradient)" 
            strokeWidth="2.2" 
          />
          
          {/* The Glare Highlights */}
          <Path 
            d="M 28 20 A 6 6 0 0 1 32 17" 
            stroke="white" 
            strokeWidth="1.5" 
            strokeLinecap="round" 
            opacity={0.9}
          />
          <Circle cx="35" cy="21" r="1" fill="white" opacity={0.7} />

          {/* Subtle "O" branding inside the frame */}
          <Text 
            x="32" 
            y="24" 
            textAnchor="middle" 
            alignmentBaseline="middle"
            fontSize="14" 
            fontWeight="900" 
            fill="none" 
            stroke="url(#shinyBlueGradient)" 
            strokeWidth="0.5"
            opacity={0.3}
          >
            O
          </Text>
        </AnimatedG>
      </Svg>
    </View>
  );
};

export default React.memo(LetterOFace);