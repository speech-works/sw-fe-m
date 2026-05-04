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
    Text,
    SvgProps
} from "react-native-svg";

const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedPath = Animated.createAnimatedComponent(Path);

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

const LetterLFace = ({
  size = 48,
  width,
  height,
  shouldAnimate = false,
  transparentBg = false,
  ...props
}: SvgIconProps) => {
  const activeWidth = width || size;
  const activeHeight = height || size;

  const waveAnim = useSharedValue(0);
  const blink = useSharedValue(1);

  useEffect(() => {
    if (shouldAnimate) {
      waveAnim.value = withRepeat(
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
      blink.value = withRepeat(
        withSequence(
          withDelay(
            Math.random() * 3000 + 2000,
            withTiming(0.1, { duration: 100 })
          ),
          withTiming(1, { duration: 100 })
        ),
        -1,
        false
      );
    } else {
      waveAnim.value = 0;
      blink.value = 1;
    }

    return () => {
      cancelAnimation(waveAnim);
      cancelAnimation(blink);
    };
  }, [shouldAnimate]);

  const waveProps = useAnimatedProps(() => ({
    transform: [{ translateY: waveAnim.value * 2 }] as any,
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
        {!transparentBg && (
          <Circle cx="24" cy="24" r="24" fill="#B2EBF2" />
        )}

        {/* Underwater Background Level */}
        <AnimatedPath 
          d="M 0 16 Q 12 12 24 16 T 48 16 V 48 H 0 Z" 
          fill="#03A9F4" 
          opacity={0.3} 
          animatedProps={waveProps}
        />

        <Path d={FACE_PATH} fill="black" opacity={0.25} transform="translate(1, 1)" />
        <Path d={FACE_PATH} fill={SKIN_COLOR} />

        <AnimatedG animatedProps={eyeProps}>
          <Circle cx="16" cy="24" r="2.5" fill={INK_COLOR} />
          <Circle cx="32" cy="24" r="2.5" fill={INK_COLOR} />
        </AnimatedG>

        {/* Mirrored 'L' acting as a snorkel tubing up from the mouth */}
        <G transform="translate(30, 26) scale(-1, 1)">
            <Text 
                textAnchor="middle" 
                fontSize="32" 
                fontWeight="900" 
                fill="#FF5722"
                y="6"
            >
                L
            </Text>
        </G>
      </Svg>
    </View>
  );
};

export default React.memo(LetterLFace);