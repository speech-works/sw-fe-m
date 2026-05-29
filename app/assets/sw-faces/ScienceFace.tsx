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
    cancelAnimation
} from "react-native-reanimated";
import Svg, {
    Circle,
    G,
    Path,
    SvgProps
} from "react-native-svg";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

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

const ScienceFace = ({
  size = 48,
  width,
  height,
  shouldAnimate = false,
  transparentBg = false,
  ...props
}: SvgIconProps) => {
  const activeWidth = width || size;
  const activeHeight = height || size;

  const bubble1 = useSharedValue(26);
  const bubble2 = useSharedValue(28);
  const bubble3 = useSharedValue(25);

  useEffect(() => {
    if (shouldAnimate) {
      bubble1.value = withRepeat(
        withSequence(
          withTiming(20, { duration: 500 }),
          withTiming(26, { duration: 500 })
        ),
        -1,
        false
      );
      bubble2.value = withRepeat(
        withSequence(
          withTiming(18, { duration: 750 }),
          withTiming(28, { duration: 750 })
        ),
        -1,
        false
      );
      bubble3.value = withRepeat(
        withSequence(
          withTiming(16, { duration: 600 }),
          withTiming(25, { duration: 600 })
        ),
        -1,
        false
      );
    } else {
      bubble1.value = 26;
      bubble2.value = 28;
      bubble3.value = 25;
    }

    return () => {
      cancelAnimation(bubble1);
      cancelAnimation(bubble2);
      cancelAnimation(bubble3);
    };
  }, [shouldAnimate]);

  const bubble1Props = useAnimatedProps(() => ({ cy: bubble1.value }));
  const bubble2Props = useAnimatedProps(() => ({ cy: bubble2.value }));
  const bubble3Props = useAnimatedProps(() => ({ cy: bubble3.value }));

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
          <Circle cx="24" cy="24" r="24" fill="#C8E6C9" />
        )}
        
        <Path d={FACE_PATH} fill="black" opacity={0.25} transform="translate(1, 1)" />
        <Path d={FACE_PATH} fill={SKIN_COLOR} />

        {/* Safety Goggles */}
        <G opacity={0.9}>
            <Path 
                d="M 8 18 h 14 v 10 c 0 3 -2 5 -5 5 h -4 c -3 0 -5 -2 -5 -5 z" 
                fill="#E0F2F1" 
                stroke="#004D40" 
                strokeWidth="1.5"
            />
            <Path 
                d="M 26 18 h 14 v 10 c 0 3 -2 5 -5 5 h -4 c -3 0 -5 -2 -5 -5 z" 
                fill="#E0F2F1" 
                stroke="#004D40" 
                strokeWidth="1.5"
            />
            <Path d="M 22 24 h 4" stroke="#004D40" strokeWidth="1.5" />
        </G>

        <Circle cx="15" cy="23" r="1.5" fill={INK_COLOR} />
        <Circle cx="33" cy="23" r="1.5" fill={INK_COLOR} />

        {/* Bubbling Flask */}
        <G transform="translate(24, 18)">
            <Path 
                d="M -4 10 L -8 24 C -9 27 -6 30 -4 30 H 12 C 14 30 17 27 16 24 L 12 10 H -4 Z" 
                fill="rgba(255,255,255,0.6)" 
                stroke="#455A64" 
                strokeWidth="0.8" 
            />
            <Path 
                d="M -6 18 L -8 24 C -9 27 -6 30 -4 30 H 12 C 14 30 17 27 16 24 L 14 18 Z" 
                fill="#00E676" 
            />
            {/* Bubbles */}
            <G fill="#FFF">
                <AnimatedCircle cx="-2" r="1.2" animatedProps={bubble1Props} />
                <AnimatedCircle cx="4" r="1.5" animatedProps={bubble2Props} />
                <AnimatedCircle cx="10" r="0.8" animatedProps={bubble3Props} />
            </G>
        </G>
      </Svg>
    </View>
  );
};

export default React.memo(ScienceFace);