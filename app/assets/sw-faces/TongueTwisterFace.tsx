import React from "react";
import { View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
} from "react-native-reanimated";
import Svg, {
  G,
  Circle,
  Defs,
  Mask,
  Path,
  Line,
  SvgProps,
} from "react-native-svg";

const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface SvgIconProps extends SvgProps {
  shouldAnimate?: boolean;
  loop?: boolean;
  repeatCount?: number;
  size?: number | string;
  width?: number | string;
  height?: number | string;
}

const TongueTwisterFace = ({
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
  const vibration = useSharedValue(0);

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
      vibration.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 50 }),
          withTiming(-1, { duration: 50 }),
          withTiming(0, { duration: 50 }),
          withDelay(1000, withTiming(0, { duration: 0 })),
        ),
        -1,
        false,
      );
    } else {
      blink.value = 1;
      vibration.value = 0;
    }
  }, [shouldAnimate]);

  const eyeProps = useAnimatedProps(() => ({
    transform: [{ scaleY: blink.value }],
    originY: 24,
  }));

  const stitchProps = useAnimatedProps(() => ({
    transform: [{ translateX: vibration.value * 0.5 }],
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
            id="cheek_knife_mask"
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

        <G mask="url(#cheek_knife_mask)">
          {/* Background - Deep Plum/Purple for dramatic effect */}
          <Path
            fill="#6A1B9A"
            d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
          />
          {/* Face Shape - Pale Peach/Skin Tone */}
          <G>
            <Path
              fill="#FFCCBC"
              d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
            />
          </G>

          <AnimatedG animatedProps={eyeProps}>
            {/* Eyes (Confused look) */}
            <Circle cx="17" cy="24" r="3" fill="#212121" />
            <Circle cx="31" cy="24" r="3" fill="#212121" />
            {/* Eye highlights */}
            <Circle cx="18" cy="23" r="1" fill="#FFFFFF" opacity="0.8" />
            <Circle cx="32" cy="23" r="1" fill="#FFFFFF" opacity="0.8" />
          </AnimatedG>

          {/* Eyebrows (Confused look) */}
          <Line
            x1="16"
            y1="17.5"
            x2="20"
            y2="19"
            stroke="#212121"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <Line
            x1="28"
            y1="19"
            x2="32"
            y2="17.5"
            stroke="#212121"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* MOUTH: Stitched with white thread */}
          <AnimatedG
            stroke="#FFFFFF"
            strokeWidth="3.5"
            strokeLinecap="round"
            fill="none"
            animatedProps={stitchProps}
          >
            {/* Main Sealing Bar */}
            <Line x1="19" y1="34" x2="29" y2="34" strokeWidth={1} />
            {/* Small 'Stitch' Lines */}
            <Line x1="22" y1="32.5" x2="22" y2="35.5" strokeWidth="1.5" />
            <Line x1="26" y1="32.5" x2="26" y2="35.5" strokeWidth="1.5" />
          </AnimatedG>
        </G>
      </Svg>
    </View>
  );
};
export default React.memo(TongueTwisterFace);
