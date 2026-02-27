import React from "react";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
} from "react-native-reanimated";

import { View } from "react-native";
import Svg, { Circle, Defs, G, Mask, Path, SvgProps } from "react-native-svg";

const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedPath = Animated.createAnimatedComponent(Path);

interface SvgIconProps extends SvgProps {
  size?: number | string;
  width?: number | string;
  height?: number | string;
  shouldAnimate?: boolean;
  loop?: boolean;
  repeatCount?: number;
}

const InterviewFace = ({
  size = 48,
  width,
  height,
  shouldAnimate = false,
  loop = false,
  repeatCount = 1,
  ...props
}: SvgIconProps) => {
  const activeWidth = width || size;
  const activeHeight = height || size;
  const blink = useSharedValue(1);
  const wiggle = useSharedValue(0);

  React.useEffect(() => {
    if (shouldAnimate) {
      blink.value = withRepeat(
        withSequence(
          withDelay(
            Math.random() * 2000 + 3000,
            withTiming(0.1, { duration: 150 }),
          ),
          withTiming(1, { duration: 150 }),
        ),
        -1,
        false,
      );
      wiggle.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1500 }),
          withTiming(0, { duration: 1500 }),
        ),
        -1,
        true,
      );
    } else {
      blink.value = 1;
      wiggle.value = 0;
    }
  }, [shouldAnimate]);

  const eyeProps = useAnimatedProps(() => ({
    transform: [{ scaleY: blink.value }] as any,
    originY: 24,
  }));

  const tieProps = useAnimatedProps(() => ({
    transform: [{ rotate: `${wiggle.value}deg` }] as any,
    originX: 24,
    originY: 38,
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
      <Svg width={activeWidth} height={activeHeight}>
        <Defs>
          <Mask
            id="senior_mask"
            x="0"
            y="0"
            width="48"
            height="48"
            maskUnits="userSpaceOnUse"
          >
            <Path
              fill="#fff"
              d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
            />
          </Mask>
        </Defs>
        <G mask="url(#senior_mask)">
          {/* Background: Professional Light Blue (Calm & Trustworthy) */}
          <Path
            fill="#E3F2FD"
            d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
          />

          <G>
            <Path
              fill="#FFDABF"
              d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
            />
          </G>

          <Path d="M8 42 L 24 44 L 24 38 Z" fill="#FFFFFF" />
          <Path d="M40 42 L 24 44 L 24 38 Z" fill="#FFFFFF" />

          {/* Necktie (Distinguished Burgundy) */}
          <AnimatedPath
            d="M24 38 L 28 41 L 27 48 L 21 48 L 20 41 Z"
            fill="#880E4F"
            animatedProps={tieProps}
          />

          {/* Glasses (Grey Rims) */}
          <Circle
            cx="16.8"
            cy="24"
            r="5.5"
            stroke="#757575"
            strokeWidth="1.5"
            fill="#FFDABF"
            fillOpacity="0.5"
          />
          <Circle
            cx="31.2"
            cy="24"
            r="5.5"
            stroke="#757575"
            strokeWidth="1.5"
            fill="#FFDABF"
            fillOpacity="0.5"
          />
          <Path d="M22.3 24 L 25.7 24" stroke="#757575" strokeWidth="1.5" />

          {/* Wrinkles/Experience lines */}
          <Path
            d="M13 26 Q 11 27, 13 28"
            stroke="#D7CCC8"
            strokeWidth="1"
            fill="none"
          />
          <Path
            d="M35 26 Q 37 27, 35 28"
            stroke="#D7CCC8"
            strokeWidth="1"
            fill="none"
          />

          <AnimatedG animatedProps={eyeProps}>
            {/* Eyes */}
            <Circle cx="16.8" cy="24" r="1.5" fill="#263238" />
            <Circle cx="31.2" cy="24" r="1.5" fill="#263238" />
          </AnimatedG>

          {/* Mouth */}
          <Path
            stroke="#8D6E63"
            strokeWidth="1.5"
            strokeLinecap="round"
            d="M20 34 Q 24 35, 28 34"
            fill="none"
          />
        </G>
      </Svg>
    </View>
  );
};
export default React.memo(InterviewFace);
