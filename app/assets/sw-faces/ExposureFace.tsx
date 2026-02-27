import React from "react";
import { View } from "react-native";
import Svg, { Circle, Defs, G, Mask, Path, SvgProps } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
} from "react-native-reanimated";

const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedPath = Animated.createAnimatedComponent(Path);

interface SvgIconProps extends SvgProps {
  shouldAnimate?: boolean;
  loop?: boolean;
  repeatCount?: number;
  size?: number | string;
  width?: number | string;
  height?: number | string;
}

const ExposureFace = ({
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
  const flutter = useSharedValue(0);

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
      flutter.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1500 }),
          withTiming(0, { duration: 1500 }),
        ),
        -1,
        true,
      );
    } else {
      blink.value = 1;
      flutter.value = 0;
    }
  }, [shouldAnimate]);

  const eyeProps = useAnimatedProps(() => ({
    transform: [{ scaleY: blink.value }] as any,
    originY: 25,
  }));

  const backgroundProps = useAnimatedProps(() => ({
    transform: [{ scale: 1 + flutter.value * 0.05 }] as any,
    originX: 24,
    originY: 24,
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
            id="hero_mask"
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
        <G mask="url(#hero_mask)">
          {/* Background: Red 200 */}
          <AnimatedPath
            fill="#FFBFBF"
            d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
            animatedProps={backgroundProps}
          />
          <G>
            {/* Face: Orange 200 */}
            <Path
              fill="#FFDABF"
              d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
            />
          </G>

          {/* Superhero Eye  (Red 600) */}
          <Path
            fill="#BF0000"
            d="M4 24 C 4 18, 14 18, 24 24 C 34 18, 44 18, 44 24 L 42 30 C 38 34, 30 30, 24 30 C 18 30, 10 34, 6 30 Z"
          />

          <AnimatedG animatedProps={eyeProps}>
            {/* Eyes (White Sclera inside mask) */}
            <Circle cx="16.8" cy="25" r="2.5" fill="#FFF" />
            <Circle cx="31.2" cy="25" r="2.5" fill="#FFF" />
            {/* Pupils (Black) */}
            <Circle cx="16.8" cy="25" r="1.5" fill="#111215" />
            <Circle cx="31.2" cy="25" r="1.5" fill="#111215" />
          </AnimatedG>

          {/* Confident Grin (Gray 800) */}
          <Path
            stroke="#111215"
            strokeWidth="2.5"
            strokeLinecap="round"
            d="M20 36 Q 26 38, 30 35"
            fill="none"
          />
        </G>
      </Svg>
    </View>
  );
};
export default React.memo(ExposureFace);
