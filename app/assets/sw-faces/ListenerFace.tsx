import Animated, {
  useSharedValue,
  useAnimatedProps,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";

import { View } from "react-native";
import Svg, { Defs, G, Mask, Path, SvgProps } from "react-native-svg";
import React from "react";

const AnimatedG = Animated.createAnimatedComponent(G);

interface SvgIconProps extends SvgProps {
  size?: number | string;
  width?: number | string;
  height?: number | string;
  shouldAnimate?: boolean;
  loop?: boolean;
  repeatCount?: number;
}

const ListenerFace = ({
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
  const bob = useSharedValue(0);

  React.useEffect(() => {
    if (shouldAnimate) {
      blink.value = withRepeat(
        withSequence(
          withDelay(
            Math.random() * 2000 + 3000,
            withTiming(0, { duration: 150 }),
          ),
          withTiming(1, { duration: 150 }),
        ),
        -1,
        false,
      );
      bob.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true,
      );
    } else {
      blink.value = 1;
      bob.value = 0;
    }
  }, [shouldAnimate]);

  const eyeProps = useAnimatedProps(() => ({
    transform: [{ scaleY: blink.value }] as any,
    originY: 24,
  }));

  const headProps = useAnimatedProps(() => ({
    transform: [{ translateY: bob.value * 1.5 }] as any,
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
      <Svg
        width={activeWidth}
        height={activeHeight}
        viewBox="0 0 48 48"
        fill="none"
        {...props}
      >
        <Defs>
          <Mask
            id="listener_mask"
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
        <G mask="url(#listener_mask)">
          {/* Background - Calm Indigo */}
          <Path
            fill="#5C6BC0"
            d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
          />

          <AnimatedG animatedProps={headProps}>
            <G>
              <Path
                fill="#FFCCBC"
                d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
              />
            </G>

            {/* Headphones Band */}
            <Path
              stroke="#3949AB"
              strokeWidth="4"
              fill="none"
              d="M6 24 C 6 12, 12 4, 24 4 C 36 4, 42 12, 42 24"
              strokeLinecap="round"
            />

            {/* Headphone Cups */}
            <Path fill="#1A237E" d="M4 18 H 8 V 34 H 4 C 2 34, 2 18, 4 18 Z" />
            <Path
              fill="#1A237E"
              d="M44 18 H 40 V 34 H 44 C 46 34, 46 18, 44 18 Z"
            />

            <AnimatedG animatedProps={eyeProps}>
              {/* Closed Eyes (Listening intently) */}
              <Path
                stroke="#BF360C"
                strokeWidth="2.5"
                strokeLinecap="round"
                d="M14 24 Q 18 20, 22 24"
                fill="none"
              />
              <Path
                stroke="#BF360C"
                strokeWidth="2.5"
                strokeLinecap="round"
                d="M26 24 Q 30 20, 34 24"
                fill="none"
              />
            </AnimatedG>

            {/* Small Smile */}
            <Path
              stroke="#BF360C"
              strokeWidth="2.5"
              strokeLinecap="round"
              d="M22 33 Q 24 35, 26 33"
              fill="none"
            />
          </AnimatedG>
        </G>
      </Svg>
    </View>
  );
};
export default React.memo(ListenerFace);
