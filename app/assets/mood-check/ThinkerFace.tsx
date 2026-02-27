import React, { useEffect } from "react";
import { View } from "react-native";
import Svg, { Defs, G, Mask, Path, Circle, SvgProps } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";

const AnimatedG = Animated.createAnimatedComponent(G);

interface SvgIconProps extends SvgProps {
  shouldAnimate?: boolean;
  loop?: boolean;
  repeatCount?: number;
  size?: number | string;
  width?: number | string;
  height?: number | string;
}

const ThinkerFace = ({
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
            withTiming(0.1, { duration: 150 }),
          ),
          withTiming(1, { duration: 150 }),
        ),
        -1,
        false,
      );
      bob.value = withRepeat(
        withSequence(
          withTiming(0.8, {
            duration: 1500,
            easing: Easing.inOut(Easing.quad),
          }),
          withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.quad) }),
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
    originY: 22,
  }));

  const bobProps = useAnimatedProps(() => ({
    transform: [{ translateY: bob.value }] as any,
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
            id="thinker_mask"
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
        <G mask="url(#thinker_mask)">
          {/* Background - Slate Grey */}
          <Path
            fill="#546E7A"
            d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
          />

          <AnimatedG animatedProps={bobProps}>
            <G>
              {/* Face Shape - Light Grey */}
              <Path
                fill="#ECEFF1"
                d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
              />
            </G>

            <AnimatedG animatedProps={eyeProps}>
              {/* Eyes (White - Looking up and right in thought) */}
              <Path
                fill="#fff"
                d="M16.8 31.2a7.2 7.2 0 1 0 0-14.4 7.2 7.2 0 0 0 0 14.4"
              />
              <Path
                fill="#fff"
                d="M31.2 31.2a7.2 7.2 0 1 0 0-14.4 7.2 7.2 0 0 0 0 14.4"
              />
              <Circle cx="18" cy="22" r="2.5" fill="#37474F" />
              <Circle cx="32.4" cy="22" r="2.5" fill="#37474F" />
            </AnimatedG>

            {/* Asymmetrical Eyebrows (One raised) */}
            <Path
              stroke="#37474F"
              strokeWidth="2.5"
              strokeLinecap="round"
              d="M12 16 L 20 16"
            />
            <Path
              stroke="#37474F"
              strokeWidth="2.5"
              strokeLinecap="round"
              d="M28 14 Q 32 10, 36 14"
            />

            {/* Small thoughtful mouth */}
            <Path
              stroke="#37474F"
              strokeWidth="2.5"
              strokeLinecap="round"
              d="M22 32 L 26 32"
            />

            {/* Hand on Chin Prop */}
            <Path
              fill="#CFD8DC"
              d="M30 48 L 30 38 C 30 36, 34 34, 38 38 L 42 44"
            />
            <Circle cx="30" cy="36" r="4" fill="#CFD8DC" />
          </AnimatedG>
        </G>
      </Svg>
    </View>
  );
};

export default React.memo(ThinkerFace);
