import React, { useEffect } from "react";
import { Easing, View } from "react-native";
import Animated, {
    useAnimatedProps,
    useDerivedValue,
    useSharedValue,
    withDelay,
    withRepeat,
    withSequence,
    withTiming,
 cancelAnimation} from "react-native-reanimated";
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
  transparentBg,
  ...props
}: SvgIconProps) => {
  const activeWidth = width || size;
  const activeHeight = height || size;
  const blink = useSharedValue(1);
  const write = useSharedValue(0);

  useEffect(() => {
    if (shouldAnimate) {
      blink.value = withRepeat(
        withSequence(
          withDelay(
            Math.random() * 2000 + 3000,
            withTiming(0, { duration: 120 }),
          ),
          withTiming(1, { duration: 120 }),
        ),
        -1,
        false,
      );
      write.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 800, easing: Easing.out(Easing.exp) }),
          withTiming(0, { duration: 800, easing: Easing.out(Easing.exp) }),
        ),
        -1,
        true,
      );
    } else {
      blink.value = 1;
      write.value = 0;
    }
  
    return () => {
      cancelAnimation(blink);
      cancelAnimation(write);
    };
  }, [shouldAnimate]);

  const blinkS = useDerivedValue(() => blink.value);
  const penX = useDerivedValue(() => write.value * 2);
  const penY = useDerivedValue(() => write.value * -1);

  const eyeProps = useAnimatedProps(() => ({
    transform: [{ scaleY: blinkS.value }],
    originY: 26,
  }));
  const penProps = useAnimatedProps(() => ({
    transform: [{ translateX: penX.value }, { translateY: penY.value }],
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
          <Mask id="theM">
            <Path
              fill="#fff"
              d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
            />
          </Mask>
        </Defs>
        <G clipPath="url(#theM)">
          {!transparentBg && (
            <Path
              fill="#BBDEFB"
              d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
            />
          )}
          <Path
            fill="black"
            opacity={0.25}
            transform="translate(4, 4)"
            d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
          />
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
            d="M12 19q4-1 8 0M28 19q4-1 8 0"
            stroke="#F5F5F5"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <G stroke="#3E2723" strokeWidth="2.5" fill="none">
            <Rect x="10" y="20" width="12" height="12" rx="3" />
            <Rect x="26" y="20" width="12" height="12" rx="3" />
            <Path d="M22 26h4" strokeWidth="2" />
          </G>
          <Rect
            x="11"
            y="21"
            width="10"
            height="10"
            rx="2"
            fill="#FFF"
            opacity="0.3"
          />
          <Rect
            x="27"
            y="21"
            width="10"
            height="10"
            rx="2"
            fill="#FFF"
            opacity="0.3"
          />
          <AnimatedG animatedProps={eyeProps}>
            <Circle cx="16" cy="26" r="1.5" fill="#3E2723" />
            <Circle cx="32" cy="26" r="1.5" fill="#3E2723" />
          </AnimatedG>
          <Path
            d="M9 26q-2-2 0-4M39 26q2-2 0-4"
            stroke="#E0E0E0"
            strokeWidth="1"
          />
          <Path
            d="M20 36q4 2 8 0"
            stroke="#3E2723"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <G transform="translate(0, 3)">
            <Rect
              x="14"
              y="36"
              width="20"
              height="14"
              rx="1"
              fill="#8D6E63"
              stroke="#5D4037"
              strokeLinecap="round"
            />
            <Rect x="16" y="38" width="16" height="11" fill="#FFF" />
            <Path d="M18 41h12M18 44h8" stroke="#BDBDBD" strokeWidth="1" />
            <Rect
              x="20"
              y="35"
              width="8"
              height="3"
              rx="0.5"
              fill="#B0BEC5"
              stroke="#78909C"
            />
            <AnimatedRect
              x="35"
              y="36"
              width="3"
              height="12"
              rx="1"
              fill="#EF5350"
              stroke="#C62828"
              animatedProps={penProps}
            />
          </G>
        </G>
      </Svg>
    </View>
  );
};
export default React.memo(TherapistFace);
