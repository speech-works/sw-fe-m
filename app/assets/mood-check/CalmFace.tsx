import * as React from "react";
import Svg, {
  Mask,
  Path,
  G,
  Defs,
  Filter,
  FeFlood,
  FeColorMatrix,
  FeOffset,
  FeGaussianBlur,
  FeComposite,
  FeBlend,
  SvgProps,
  Circle,
  Ellipse,
  LinearGradient,
  Stop,
} from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withRepeat,
  withTiming,
  Easing,
  withSequence,
} from "react-native-reanimated";

const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedPath = Animated.createAnimatedComponent(Path);

interface SvgIconProps extends SvgProps {
  shouldAnimate?: boolean;
  loop?: boolean;
  repeatCount?: number;
  size?: number | string;
}

const CalmFace = ({
  size = 48,
  width,
  height,
  shouldAnimate,
  loop,
  repeatCount,
  ...props
}: SvgIconProps) => {
  const activeWidth = width || size;
  const activeHeight = height || size;

  const windOffset = useSharedValue(0);
  const haloHover = useSharedValue(0);

  React.useEffect(() => {
    if (!shouldAnimate) {
      windOffset.value = withTiming(0);
      haloHover.value = withTiming(0);
      return;
    }

    // 1. Wind Animation
    windOffset.value = withRepeat(
      withTiming(48, { duration: 3000, easing: Easing.linear }),
      -1,
      false
    );

    // 2. Halo Hover (Bobbing up and down)
    haloHover.value = withRepeat(
      withSequence(
        withTiming(-2, { duration: 1500, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );
  }, [shouldAnimate]);

  const windProps = useAnimatedProps(() => ({
    strokeDashoffset: -windOffset.value,
  }));

  const haloProps = useAnimatedProps(() => ({
    transform: [{ translateY: haloHover.value }],
  }));

  return (
    <Svg
      width={activeWidth}
      height={activeHeight}
      viewBox="0 0 48 48"
      fill="none"
      {...props}
    >
      <Defs>
        <Filter
          id="neutral_shadow"
          x="-50%"
          y="-50%"
          width="200%"
          height="200%"
          filterUnits="userSpaceOnUse"
        >
          <FeFlood floodOpacity={0} result="BackgroundImageFix" />
          <FeColorMatrix
            in="SourceAlpha"
            result="hardAlpha"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
          />
          <FeOffset dx={4} dy={4} />
          <FeGaussianBlur stdDeviation={1} />
          <FeComposite in2="hardAlpha" operator="out" />
          <FeColorMatrix values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
          <FeBlend in2="BackgroundImageFix" result="effect1_dropShadow" />
          <FeBlend in="SourceGraphic" in2="effect1_dropShadow" result="shape" />
        </Filter>
        <Mask
          id="neutral_mask"
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
        <LinearGradient id="haloGold" x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor="#FDB931" />
          <Stop offset="40%" stopColor="#FFFFAC" />
          <Stop offset="100%" stopColor="#D4AF37" />
        </LinearGradient>
      </Defs>

      <G mask="url(#neutral_mask)">
        {/* Base Background */}
        <Path
          fill="#B8DCC2"
          d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
        />

        {/* --- 1. Angel Halo (Hovering Ellipse) --- */}
        <AnimatedG animatedProps={haloProps}>
          {/* Halo Ring */}
          <Ellipse
            cx="24"
            cy="7"
            rx="14"
            ry="4"
            fill="none"
            stroke="url(#haloGold)"
            strokeWidth="2.5"
            opacity="1"
          />
        </AnimatedG>

        {/* --- 2. Wind Animation --- */}
        <AnimatedG animatedProps={windProps}>
          <AnimatedPath
            d="M-24 10 H 72"
            stroke="#FFFFFF"
            strokeWidth="3"
            strokeOpacity="0.4"
            strokeDasharray="12 36"
            strokeLinecap="round"
          />
          <AnimatedPath
            d="M-12 24 H 84"
            stroke="#FFFFFF"
            strokeWidth="2"
            strokeOpacity="0.3"
            strokeDasharray="8 40"
            strokeLinecap="round"
          />
          <AnimatedPath
            d="M-36 38 H 60"
            stroke="#FFFFFF"
            strokeWidth="3"
            strokeOpacity="0.4"
            strokeDasharray="16 32"
            strokeLinecap="round"
          />
        </AnimatedG>

        {/* --- 3. Static Face (Foreground) --- */}
        <G filter="url(#neutral_shadow)">
          <Path
            fill="#E7E2CB"
            d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
          />
        </G>

        {/* Eyes (White) */}
        <Path
          fill="#fff"
          d="M16.8 31.2a7.2 7.2 0 1 0 0-14.4 7.2 7.2 0 0 0 0 14.4"
        />
        <Path
          fill="#fff"
          d="M31.2 31.2a7.2 7.2 0 1 0 0-14.4 7.2 7.2 0 0 0 0 14.4"
        />

        {/* Pupils (Dark) */}
        <Path
          fill="#4A4A4A"
          d="M16.8 28.32a4.32 4.32 0 1 0 0-8.64 4.32 4.32 0 0 0 0 8.64M31.2 28.32a4.32 4.32 0 1 0 0-8.64 4.32 4.32 0 0 0 0 8.64"
        />
      </G>
    </Svg>
  );
};

export default CalmFace;
