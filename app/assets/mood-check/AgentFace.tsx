import React, { useEffect } from "react";
import { View } from "react-native";
import Svg, { Circle, Defs, G, Mask, Path, SvgProps } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
  useDerivedValue,
} from "react-native-reanimated";

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

const AgentFace = ({
  size = 48,
  width,
  height,
  shouldAnimate = false,
  ...props
}: SvgIconProps) => {
  const activeWidth = width || size;
  const activeHeight = height || size;
  const glint = useSharedValue(0);
  const wire = useSharedValue(1);

  useEffect(() => {
    if (shouldAnimate) {
      glint.value = withRepeat(
        withSequence(
          withDelay(
            Math.random() * 2000 + 3000,
            withTiming(1, { duration: 400 }),
          ),
          withTiming(0, { duration: 0 }),
        ),
        -1,
        false,
      );
      wire.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 1000, easing: Easing.out(Easing.exp) }),
          withTiming(1, { duration: 1000, easing: Easing.out(Easing.exp) }),
        ),
        -1,
        true,
      );
    } else {
      glint.value = 0;
      wire.value = 1;
    }
  }, [shouldAnimate]);

  const glintOp = useDerivedValue(() => glint.value);
  const glintX = useDerivedValue(() => glint.value * 10 - 5);
  const wireS = useDerivedValue(() => wire.value);

  const glintProps = useAnimatedProps(() => ({
    opacity: glintOp.value,
    transform: [{ translateX: glintX.value }] as any,
  }));
  const wireProps = useAnimatedProps(() => ({
    transform: [{ scaleY: wireS.value }] as any,
    originY: 26,
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
            id="agentM"
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
        <G mask="url(#agentM)">
          <Path
            fill="#263238"
            d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
          />
          <Path
            fill="#FFCCBC"
            d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
          />
          <Path fill="#000" d="M10 24h10v6h-8zM28 24h10l-2 6h-8z" />
          <Path stroke="#000" strokeWidth="2" d="M20 25h8" />
          <AnimatedPath
            d="M12 24h4l-2 6h-4z"
            fill="#FFF"
            animatedProps={glintProps}
          />
          <Path
            stroke="#000"
            strokeWidth="2"
            strokeLinecap="round"
            d="M22 36h4"
          />
          <Path fill="#37474F" d="M14-4h20l2 12H12z" />
          <Path fill="#000" d="M12 4h24v4H12z" />
          <Path
            stroke="#37474F"
            strokeWidth="4"
            strokeLinecap="round"
            d="M4 8q20 4 40 0"
            fill="none"
          />
          <AnimatedPath
            stroke="#90A4AE"
            strokeWidth="1.5"
            strokeLinecap="round"
            fill="none"
            d="M39 26c3 0 5 4 3 10s2 8 2 14"
            opacity="0.8"
            animatedProps={wireProps}
          />
          <Circle cx="39" cy="26" r="1.5" fill="#90A4AE" />
        </G>
      </Svg>
    </View>
  );
};
export default React.memo(AgentFace);
