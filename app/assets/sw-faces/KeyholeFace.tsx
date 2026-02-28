import React, { useEffect } from "react";
import Animated, {
    useAnimatedProps,
    useDerivedValue,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming
,
    cancelAnimation} from "react-native-reanimated";

import { Easing, View } from "react-native";
import Svg, { Circle, Defs, G, Mask, Path, SvgProps } from "react-native-svg";

const AnimatedG = Animated.createAnimatedComponent(G);

interface SvgIconProps extends SvgProps {
  size?: number | string;
  width?: number | string;
  height?: number | string;
  shouldAnimate?: boolean;
  loop?: boolean;
  repeatCount?: number;
}

const KeyholeFace = ({
  size = 48,
  width,
  height,
  shouldAnimate = false,
  ...props
}: SvgIconProps) => {
  const activeWidth = width || size;
  const activeHeight = height || size;
  const flare = useSharedValue(0);

  useEffect(() => {
    if (shouldAnimate) {
      flare.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true,
      );
    } else {
      flare.value = 0;
    }
  
    return () => {
      cancelAnimation(flare);
    };
  }, [shouldAnimate]);

  const fOp = useDerivedValue(() => 0.6 + flare.value * 0.4);
  const fSc = useDerivedValue(() => 1 + flare.value * 0.05);

  const flareProps = useAnimatedProps(() => ({
    opacity: fOp.value,
    transform: [{ scale: fSc.value }] as any,
    originX: 24,
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
          <Mask id="keyM">
            <Path
              fill="#fff"
              d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
            />
          </Mask>
        </Defs>
        <G mask="url(#keyM)">
          <Path
            fill="#212121"
            d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
          />
          <Path
            fill="#424242"
            d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
          />
          <AnimatedG animatedProps={flareProps}>
            <Circle cx="24" cy="24" r="4" fill="#FDD835" />
            <Path d="M22 26l-2 8h8l-2-8z" fill="#FDD835" />
          </AnimatedG>
        </G>
      </Svg>
    </View>
  );
};
export default React.memo(KeyholeFace);
