import React from "react";
import { View } from "react-native";
import Svg, {
  G,
  Circle,
  Rect,
  Path,
  Defs,
  Mask,
  SvgProps,
} from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
} from "react-native-reanimated";

const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedRect = Animated.createAnimatedComponent(Rect);

interface SvgIconProps extends SvgProps {
  shouldAnimate?: boolean;
  loop?: boolean;
  repeatCount?: number;
  size?: number | string;
  width?: number | string;
  height?: number | string;
  transparentBg?: boolean;
}

const TherapistFace = ({
  size = 48,
  width,
  height,
  shouldAnimate = false,
  loop = false,
  repeatCount = 1,
  transparentBg,
  ...props
}: SvgIconProps) => {
  const activeWidth = width || size;
  const activeHeight = height || size;
  const blink = useSharedValue(1);
  const write = useSharedValue(0);

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
      write.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 800 }),
          withTiming(0, { duration: 800 }),
        ),
        -1,
        true,
      );
    } else {
      blink.value = 1;
      write.value = 0;
    }
  }, [shouldAnimate]);

  const eyeProps = useAnimatedProps(() => ({
    transform: [{ scaleY: blink.value }],
    originY: 26,
  }));

  const penProps = useAnimatedProps(() => ({
    transform: [
      { translateX: write.value * 2 },
      { translateY: write.value * -1 },
    ],
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
          <Mask id="clip_mask">
            <Path
              fill="#fff"
              d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
            />
          </Mask>
        </Defs>
        <G clipPath="url(#clip_mask)">
          {/* --- BASE FACE --- */}
          {!transparentBg && (
            <Path
              fill="#BBDEFB"
              d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
            />
          )}
          {/* Shadow - Vector approximation */}
          <Path
            fill="black"
            opacity={0.25}
            transform="translate(4, 4)"
            d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
          />
          {/* Face Shape */}
          <Path
            fill="#F5F5F5"
            d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
          />
          <G fill="#F5F5F5">
            <Circle cx="10" cy="14" r="4" />
            <Circle cx="14" cy="11" r="4" />
            <Circle cx="20" cy="9" r="4" />
            <Circle cx="28" cy="9" r="4" />
            <Circle cx="34" cy="11" r="4" />
            <Circle cx="38" cy="14" r="4" />
            <Circle cx="8" cy="20" r="3" />
            <Circle cx="40" cy="20" r="3" />
          </G>
          <Path
            d="M12 19 Q 16 18, 20 19"
            stroke="#F5F5F5"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <Path
            d="M28 19 Q 32 18, 36 19"
            stroke="#F5F5F5"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <G stroke="#3E2723" strokeWidth="2.5" fill="none">
            <Rect x="10" y="20" width="12" height="12" rx="3" />
            <Rect x="26" y="20" width="12" height="12" rx="3" />
            <Path d="M22 26 L 26 26" strokeWidth="2" />
          </G>
          <Rect
            x="11"
            y="21"
            width="10"
            height="10"
            rx="2"
            fill="#FFFFFF"
            opacity="0.3"
          />
          <Rect
            x="27"
            y="21"
            width="10"
            height="10"
            rx="2"
            fill="#FFFFFF"
            opacity="0.3"
          />

          <AnimatedG animatedProps={eyeProps}>
            <Circle cx="16" cy="26" r="1.5" fill="#3E2723" />
            <Circle cx="32" cy="26" r="1.5" fill="#3E2723" />
          </AnimatedG>

          <Path d="M9 26 Q 7 24, 9 22" stroke="#E0E0E0" strokeWidth="1" />
          <Path d="M39 26 Q 41 24, 39 22" stroke="#E0E0E0" strokeWidth="1" />
          <Path
            d="M20 36 Q 24 38, 28 36"
            stroke="#3E2723"
            strokeWidth="1.5"
            strokeLinecap="round"
          />

          {/* --- PROP: CLIPBOARD & PEN --- */}
          <G transform="translate(0, 3)">
            <Rect
              x="14"
              y="36"
              width="20"
              height="14"
              rx="1"
              fill="#8D6E63"
              stroke="#5D4037"
              strokeWidth="1"
            />
            {/* Paper */}
            <Rect x="16" y="38" width="16" height="11" fill="#FFFFFF" />
            {/* Text lines */}
            <Path d="M18 41 H 30" stroke="#BDBDBD" strokeWidth="1" />
            <Path d="M18 44 H 26" stroke="#BDBDBD" strokeWidth="1" />
            {/* Clip mechanism */}
            <Rect
              x="20"
              y="35"
              width="8"
              height="3"
              rx="0.5"
              fill="#B0BEC5"
              stroke="#78909C"
              strokeWidth="1"
            />
            {/* Pen resting on side */}
            <AnimatedRect
              x="35"
              y="36"
              width="3"
              height="12"
              rx="1"
              fill="#EF5350"
              stroke="#C62828"
              strokeWidth="1"
              animatedProps={penProps}
            />
          </G>
        </G>
      </Svg>
    </View>
  );
};
export default React.memo(TherapistFace);
