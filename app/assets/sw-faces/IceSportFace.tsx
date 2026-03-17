import Animated, {
    Easing,
    useAnimatedProps,
    useDerivedValue,
    useSharedValue,
    withDelay,
    withRepeat,
    withSequence,
    withTiming,
 cancelAnimation} from "react-native-reanimated";

import React, { useEffect } from "react";
import { View } from "react-native";
import Svg, { Circle, Defs, G, Mask, Path, SvgProps } from "react-native-svg";

const AnimatedG = Animated.createAnimatedComponent(G);

interface SvgIconProps extends SvgProps {
  size?: number | string;
  width?: number | string;
  height?: number | string;
  shouldAnimate?: boolean;
  loop?: boolean;
  repeatCount?: number;
  transparentBg?: boolean;
}

const IceSportFace = ({
  size = 48,
  width,
  height,
  shouldAnimate = false,
  transparentBg = false,
  ...props
}: SvgIconProps) => {
  const activeWidth = width || size;
  const activeHeight = height || size;
  const blink = useSharedValue(1);
  const wiggle = useSharedValue(0);

  useEffect(() => {
    if (shouldAnimate) {
      blink.value = withRepeat(
        withSequence(
          withDelay(
            Math.random() * 2000 + 3000,
            withTiming(0.1, { duration: 120 }),
          ),
          withTiming(1, { duration: 120 }),
        ),
        -1,
        false,
      );
      wiggle.value = withRepeat(
        withSequence(
          withTiming(2, { duration: 500, easing: Easing.out(Easing.exp) }),
          withTiming(0, { duration: 500, easing: Easing.out(Easing.exp) }),
        ),
        -1,
        true,
      );
    } else {
      blink.value = 1;
      wiggle.value = 0;
    }
  
    return () => {
      cancelAnimation(blink);
      cancelAnimation(wiggle);
    };
  }, [shouldAnimate]);

  const blinkS = useDerivedValue(() => blink.value);
  const wigS = useDerivedValue(() => `${wiggle.value}deg`);

  const eyeProps = useAnimatedProps(() => ({
    transform: [{ scaleY: blinkS.value }] as any,
    originY: 24,
  }));
  const flagProps = useAnimatedProps(() => ({
    transform: [{ rotate: wigS.value }] as any,
    originX: 0,
    originY: 0,
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
          <Mask id="iceM">
            <Circle cx="24" cy="24" r="24" fill="#fff" />
          </Mask>
        </Defs>
        <G mask="url(#iceM)">
          {!transparentBg && <Circle cx="24" cy="24" r="24" fill="#0277BD" />}
          <G>
            <Path
              d="M0 48L0 28l8-10l8 6l8-12l8 8l8-12l6 8l2-2v34z"
              fill="#B0BEC5"
            />
            <Path
              d="M8 18l-3 4h6zM24 12l-3 4h6zM40 8l-3 4h6zM46 16l-2-2h4v4z"
              fill="#FFF"
            />
            <AnimatedG transform="translate(24, 12)" animatedProps={flagProps}>
              <Path
                d="M0 0v-5"
                stroke="#546E7A"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <Path d="M0-5l5 2l-5 2z" fill="#4CAF50" />
            </AnimatedG>
          </G>
          <G transform="translate(0, 10)">
            <Path
              fill="#FFD4B8"
              d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
            />
            <Path
              d="M6 21q18-7 36 0"
              stroke="#212121"
              strokeWidth="6"
              strokeLinecap="round"
            />
            <Path d="M10 19h28" stroke="#FF3D00" strokeWidth="1.5" />
            <Circle
              cx="16.5"
              cy="24"
              r="7"
              fill="#FFEB3B"
              stroke="#212121"
              strokeWidth="2.5"
            />
            <Circle
              cx="31.5"
              cy="24"
              r="7"
              fill="#FFEB3B"
              stroke="#212121"
              strokeWidth="2.5"
            />
            <Path
              d="M22.5 24h3"
              stroke="#212121"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <Path d="M12 21h6" stroke="#FFF" strokeWidth="2" opacity="0.8" />
            <Path d="M27 21h6" stroke="#FFF" strokeWidth="2" opacity="0.8" />
            <AnimatedG animatedProps={eyeProps}>
              <Circle cx="16.5" cy="24" r="2" fill="#000" />
              <Circle cx="31.5" cy="24" r="2" fill="#000" />
            </AnimatedG>
            <Path
              d="M18 35q6 3 12 0"
              stroke="#3E2723"
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
            />
          </G>
        </G>
      </Svg>
    </View>
  );
};
export default React.memo(IceSportFace);
