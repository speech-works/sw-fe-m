import React, { useEffect } from "react";
import Animated, {
    useAnimatedProps,
    useDerivedValue,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming
} from "react-native-reanimated";

import { Easing, View } from "react-native";
import Svg, {
    Circle,
    Defs,
    G,
    Mask,
    Path,
    Rect,
    SvgProps,
} from "react-native-svg";

const AnimatedPath = Animated.createAnimatedComponent(Path);

interface SvgIconProps extends SvgProps {
  size?: number | string;
  width?: number | string;
  height?: number | string;
  shouldAnimate?: boolean;
  loop?: boolean;
  repeatCount?: number;
}

const ReportFace = ({
  size = 48,
  width,
  height,
  shouldAnimate = false,
  ...props
}: SvgIconProps) => {
  const activeWidth = width || size;
  const activeHeight = height || size;
  const wiggle = useSharedValue(0);

  useEffect(() => {
    if (shouldAnimate) {
      wiggle.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1000, easing: Easing.out(Easing.exp) }),
          withTiming(0, { duration: 1000, easing: Easing.out(Easing.exp) }),
        ),
        -1,
        true,
      );
    } else {
      wiggle.value = 0;
    }
  }, [shouldAnimate]);

  const wigRot = useDerivedValue(() => `${wiggle.value * -5}deg`);
  const flagProps = useAnimatedProps(() => ({
    transform: [{ rotate: wigRot.value }] as any,
    originX: 34,
    originY: 28,
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
          <Mask id="repM">
            <Circle cx="24" cy="24" r="24" fill="#fff" />
          </Mask>
        </Defs>
        <Circle cx="24" cy="24" r="24" fill="#FFF59D" />
        <G mask="url(#repM)">
          <Rect x="4" y="24" width="8" height="20" rx="2" fill="#FF7043" />
          <Rect x="16" y="10" width="8" height="34" rx="2" fill="#FF7043" />
          <Rect x="28" y="4" width="8" height="40" rx="2" fill="#FF7043" />
          <G opacity={0.9} transform="translate(0, 8)">
            <Path
              fill="#FFDABF"
              d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
            />
            <Path
              fill="#FFDABF"
              d="M32 28c2-2 4 0 2 2l-2-2z"
              transform="rotate(15, 34, 28)"
            />
            <Rect
              x="32"
              y="26"
              width="3.5"
              height="14"
              fill="#757575"
              rx="1.7"
            />
            <AnimatedPath
              fill="#4CAF50"
              d="M35 26c5-1 9 .5 10 2.5c1 2-2 3.5-5 2.8c-3-.7-3 .7-5.2-.3z"
              animatedProps={flagProps}
            />
            <Path
              stroke="#212121"
              strokeWidth="2.5"
              strokeLinecap="round"
              d="M14 24q2 2 6 0M28 24q2 2 6 0"
              fill="none"
            />
            <Path
              stroke="#BF360C"
              strokeWidth="2.5"
              strokeLinecap="round"
              d="M18 34q6 3 12 0"
              fill="none"
            />
          </G>
          <Path
            d="M6 30c6 0 14-10 26-24"
            stroke="#4CAF50"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
          <Path
            d="M26 6h6v6"
            stroke="#4CAF50"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </G>
      </Svg>
    </View>
  );
};
export default React.memo(ReportFace);
