import React, { useEffect, useMemo } from "react";
import { View } from "react-native";
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
  Easing,
} from "react-native-reanimated";
import Svg, {
  Circle,
  ClipPath,
  Defs,
  G,
  Path,
  Rect,
  Text,
  TSpan,
  Line,
  SvgProps,
} from "react-native-svg";

const AnimatedG = Animated.createAnimatedComponent(G);

/**
 * PROPS INTERFACE
 * @param size - The dimensions of the square container
 * @param shouldAnimate - Toggle for the slot machine sequence
 * @param targetNumber - A 3-digit number string or number (e.g., "404", 777)
 * @param transparentBg - Toggle for background visibility
 */
export interface SlotMachineProps extends SvgProps {
  size?: number | string;
  shouldAnimate?: boolean;
  targetNumber?: string | number;
  transparentBg?: boolean;
}

const REEL_HEIGHT = 20; // Distance between numbers in the reel
const SPIN_BASE = 600; // Landing offset (starts at index 30)
const CYCLE_DURATION = 8000; // 8 seconds total per cycle

export const SlotMachineFace: React.FC<SlotMachineProps> = ({
  size = 100,
  shouldAnimate = true,
  targetNumber = "404",
  transparentBg = false,
  style,
  ...props
}) => {
  const leverY = useSharedValue(0);
  const jitterX = useSharedValue(0);
  const jitterY = useSharedValue(0);
  
  const reel1Y = useSharedValue(0);
  const reel2Y = useSharedValue(0);
  const reel3Y = useSharedValue(0);

  const digits = useMemo(() => {
    const s = String(targetNumber).padStart(3, "0");
    return [parseInt(s[0]), parseInt(s[1]), parseInt(s[2])];
  }, [targetNumber]);

  useEffect(() => {
    if (shouldAnimate) {
      // 1. Lever Animation: Pulls 0-400ms, returns 400-1000ms
      leverY.value = withRepeat(
        withSequence(
          withTiming(14, { duration: 400, easing: Easing.out(Easing.back(1.5)) }),
          withTiming(0, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withDelay(CYCLE_DURATION - 1000, withTiming(0, { duration: 0 }))
        ),
        -1,
        false
      );

      // 2. Jitter Animation: Shakes after lever pull (1000ms to 2000ms)
      jitterX.value = withRepeat(
        withSequence(
          withDelay(1000, withTiming(-0.8, { duration: 50 })),
          withRepeat(
            withSequence(
              withTiming(0.8, { duration: 50 }),
              withTiming(-0.8, { duration: 50 })
            ),
            9, // 9 * 100ms = 900ms + initial 50ms + final 50ms = 1000ms total jerk
            true
          ),
          withTiming(0, { duration: 50 }),
          withDelay(CYCLE_DURATION - 2000, withTiming(0, { duration: 0 }))
        ),
        -1,
        false
      );
      jitterY.value = withRepeat(
        withSequence(
          withDelay(1000, withTiming(0.8, { duration: 50 })),
          withRepeat(
            withSequence(
              withTiming(-0.8, { duration: 50 }),
              withTiming(0.8, { duration: 50 })
            ),
            9,
            true
          ),
          withTiming(0, { duration: 50 }),
          withDelay(CYCLE_DURATION - 2000, withTiming(0, { duration: 0 }))
        ),
        -1,
        false
      );

      // 3. Reels: Start at T=2000ms after jerk stops
      // Reel 1: Lands at T=4000ms
      reel1Y.value = withRepeat(
        withSequence(
          // Hold the current target digit at index 0 (visual offset) during lever and jerk
          withTiming(-(digits[0] * REEL_HEIGHT), { duration: 0 }),
          withDelay(2000, withTiming(-(SPIN_BASE + digits[0] * REEL_HEIGHT), { 
            duration: 2000, 
            easing: Easing.bezier(0.45, 0.05, 0.55, 0.95) 
          })),
          withDelay(CYCLE_DURATION - 4000, withTiming(-(SPIN_BASE + digits[0] * REEL_HEIGHT), { duration: 0 }))
        ),
        -1,
        false
      );

      // Reel 2: Lands at T=4500ms
      reel2Y.value = withRepeat(
        withSequence(
          withTiming(-(digits[1] * REEL_HEIGHT), { duration: 0 }),
          withDelay(2000, withTiming(-(SPIN_BASE + digits[1] * REEL_HEIGHT), { 
            duration: 2500, 
            easing: Easing.bezier(0.45, 0.05, 0.55, 0.95) 
          })),
          withDelay(CYCLE_DURATION - 4500, withTiming(-(SPIN_BASE + digits[1] * REEL_HEIGHT), { duration: 0 }))
        ),
        -1,
        false
      );

      // Reel 3: Lands at T=5000ms
      reel3Y.value = withRepeat(
        withSequence(
          withTiming(-(digits[2] * REEL_HEIGHT), { duration: 0 }),
          withDelay(2000, withTiming(-(SPIN_BASE + digits[2] * REEL_HEIGHT), { 
            duration: 3000, 
            easing: Easing.bezier(0.45, 0.05, 0.55, 0.95) 
          })),
          withDelay(CYCLE_DURATION - 5000, withTiming(-(SPIN_BASE + digits[2] * REEL_HEIGHT), { duration: 0 }))
        ),
        -1,
        false
      );
    } else {
      leverY.value = 0;
      jitterX.value = 0;
      jitterY.value = 0;
      reel1Y.value = -(SPIN_BASE + digits[0] * REEL_HEIGHT);
      reel2Y.value = -(SPIN_BASE + digits[1] * REEL_HEIGHT);
      reel3Y.value = -(SPIN_BASE + digits[2] * REEL_HEIGHT);
    }

    return () => {
      cancelAnimation(leverY);
      cancelAnimation(jitterX);
      cancelAnimation(jitterY);
      cancelAnimation(reel1Y);
      cancelAnimation(reel2Y);
      cancelAnimation(reel3Y);
    };
  }, [shouldAnimate, digits]);

  const bodyProps = useAnimatedProps(() => ({
    transform: [{ translateX: jitterX.value }, { translateY: jitterY.value }] as any,
  }));

  const leverProps = useAnimatedProps(() => ({
    transform: [{ translateY: leverY.value }] as any,
  }));

  const reel1Props = useAnimatedProps(() => ({
    transform: [{ translateY: reel1Y.value }] as any,
  }));

  const reel2Props = useAnimatedProps(() => ({
    transform: [{ translateY: reel2Y.value }] as any,
  }));

  const reel3Props = useAnimatedProps(() => ({
    transform: [{ translateY: reel3Y.value }] as any,
  }));

  const FACE_PATH =
    "M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736";
  const INK_COLOR = "#111215";

  // Reel numbers: 5 sets of 0-9 to allow for high-speed blur/scrolling
  const reelNumbers = [
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9
  ];

  return (
    <View
      style={[
        {
          width: size as any,
          height: size as any,
          borderRadius: (Number(size) || 100) / 2,
          overflow: "hidden",
          backgroundColor: transparentBg ? "transparent" : "#000",
        },
        style as any,
      ]}
    >
      <Svg viewBox="0 0 48 48" width="100%" height="100%" fill="none" {...props}>
        <Defs>
          <ClipPath id="clip-face">
            <Circle cx="24" cy="24" r="24" />
          </ClipPath>
          <ClipPath id="clip-reels">
            <Rect x="10" y="20" width="28" height="10" rx="1.5" />
          </ClipPath>
        </Defs>
        <G clipPath="url(#clip-face)">
          {!transparentBg && <Circle cx="24" cy="24" r="24" fill="#000" />}

          <AnimatedG animatedProps={bodyProps}>
            <Path d={FACE_PATH} fill="#1E293B" />
            <Rect x="8" y="18" width="32" height="14" fill={INK_COLOR} rx="2" />

            <G clipPath="url(#clip-reels)">
              <Rect x="10" y="20" width="28" height="10" fill="#0F172A" />

              <AnimatedG animatedProps={reel1Props}>
                <Text
                  x="14"
                  y="28"
                  fill="#EF4444"
                  fontSize="11"
                  fontWeight="900"
                  textAnchor="middle"
                >
                  {reelNumbers.map((n, i) => (
                    <TSpan key={i} x="14" dy={i === 0 ? 0 : 20}>
                      {String(n)}
                    </TSpan>
                  ))}
                </Text>
              </AnimatedG>

              <AnimatedG animatedProps={reel2Props}>
                <Text
                  x="24"
                  y="28"
                  fill="#EF4444"
                  fontSize="11"
                  fontWeight="900"
                  textAnchor="middle"
                >
                  {reelNumbers.map((n, i) => (
                    <TSpan key={i} x="24" dy={i === 0 ? 0 : 20}>
                      {String(n)}
                    </TSpan>
                  ))}
                </Text>
              </AnimatedG>

              <AnimatedG animatedProps={reel3Props}>
                <Text
                  x="34"
                  y="28"
                  fill="#EF4444"
                  fontSize="11"
                  fontWeight="900"
                  textAnchor="middle"
                >
                  {reelNumbers.map((n, i) => (
                    <TSpan key={i} x="34" dy={i === 0 ? 0 : 20}>
                      {String(n)}
                    </TSpan>
                  ))}
                </Text>
              </AnimatedG>
            </G>

            <Line x1="19" y1="20" x2="19" y2="30" stroke={INK_COLOR} strokeWidth="1" />
            <Line x1="29" y1="20" x2="29" y2="30" stroke={INK_COLOR} strokeWidth="1" />
          </AnimatedG>

          <AnimatedG animatedProps={leverProps}>
            <Rect x="40" y="24" width="2.5" height="12" fill="#334155" rx="1.2" />
            <Circle cx="41.2" cy="24" r="3.5" fill="#EF4444" />
          </AnimatedG>

          <Path
            d="M 21 38 H 27"
            stroke={INK_COLOR}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </G>
      </Svg>
    </View>
  );
};

export default React.memo(SlotMachineFace);
