import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, {
    Easing,
    useAnimatedProps,
    useDerivedValue,
    useSharedValue,
    withDelay,
    withRepeat,
    withSequence,
    withTiming,
} from "react-native-reanimated";
import Svg, {
    Circle,
    Defs,
    G,
    Mask,
    Path,
    Rect,
    SvgProps,
} from "react-native-svg";

const AnimatedG = Animated.createAnimatedComponent(G);

interface SvgIconProps extends SvgProps {
  shouldAnimate?: boolean;
  loop?: boolean;
  repeatCount?: number;
  size?: number | string;
  width?: number | string;
  height?: number | string;
  transparentBg?: boolean;
}

const FinishLineCoolFace = ({
  size = 48,
  width,
  height,
  shouldAnimate = true,
  transparentBg,
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
            Math.random() * 2000 + 4000,
            withTiming(0.1, { duration: 120 }),
          ),
          withTiming(1, { duration: 120 }),
        ),
        -1,
        false,
      );
      wiggle.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 150, easing: Easing.out(Easing.exp) }),
          withTiming(0, { duration: 150, easing: Easing.out(Easing.exp) }),
        ),
        -1,
        false,
      );
    } else {
      blink.value = 1;
      wiggle.value = 0;
    }
  }, [shouldAnimate]);

  const blinkS = useDerivedValue(() => blink.value);
  const lRot = useDerivedValue(() => `${wiggle.value * 12}deg`);
  const rRot = useDerivedValue(() => `${(1 - wiggle.value) * -12}deg`);
  const sX = useDerivedValue(() => 1 - Math.sin(wiggle.value * Math.PI) * 0.1);

  const faceProps = useAnimatedProps(() => ({
    transform: [{ scaleY: blinkS.value }] as any,
    originY: 24,
  }));
  const lTape = useAnimatedProps(() => ({
    transform: [
      { translateX: 10 },
      { translateY: 40 },
      { rotate: lRot.value },
      { scaleX: sX.value },
      { translateX: -10 },
      { translateY: -40 },
    ] as any,
  }));
  const rTape = useAnimatedProps(() => ({
    transform: [
      { translateX: 38 },
      { translateY: 40 },
      { rotate: rRot.value },
      { scaleX: sX.value },
      { translateX: -38 },
      { translateY: -40 },
    ] as any,
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
          <Mask
            id="finM"
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
        <G mask="url(#finM)">
          {!transparentBg && (
            <Path
              fill="#FFC107"
              d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
            />
          )}
          <AnimatedG animatedProps={faceProps}>
            <Path
              fill="#FFCCBC"
              d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
            />
            <Path
              fill="#263238"
              d="M8 22c0 0 2 7 9 7s9-7 9-7H8zM26 22c0 0 2 7 9 7s9-7 9-7H26z"
            />
            <Path stroke="#263238" strokeWidth="2.5" d="M22 23h4" />
            <Path
              fill="#546E7A"
              opacity="0.5"
              d="M10 23h5l-5 4zM28 23h5l-5 4z"
            />
          </AnimatedG>
          <Path
            stroke="#BF360C"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
            d="M22 35q4 2 8-2"
          />
          <AnimatedG animatedProps={lTape}>
            <Rect x="0" y="38" width="20" height="6" fill="#FFF" />
            <Rect x="0" y="38" width="5" height="3" fill="#000" />
            <Rect x="10" y="38" width="5" height="3" fill="#000" />
            <Rect x="5" y="41" width="5" height="3" fill="#000" />
            <Rect x="15" y="41" width="5" height="3" fill="#000" />
          </AnimatedG>
          <AnimatedG animatedProps={rTape}>
            <Rect x="28" y="38" width="20" height="6" fill="#FFF" />
            <Rect x="28" y="38" width="5" height="3" fill="#000" />
            <Rect x="38" y="38" width="5" height="3" fill="#000" />
            <Rect x="33" y="41" width="5" height="3" fill="#000" />
            <Rect x="43" y="41" width="5" height="3" fill="#000" />
          </AnimatedG>
          <G transform="rotate(45 10 10)">
            <Rect x="10" y="10" width="3" height="3" fill="#FFF" />
          </G>
          <G transform="rotate(20 38 12)">
            <Rect x="38" y="12" width="3" height="3" fill="#000" />
          </G>
          <Circle cx="24" cy="8" r="1.5" fill="#FFF" />
        </G>
      </Svg>
    </View>
  );
};
export default React.memo(FinishLineCoolFace);
