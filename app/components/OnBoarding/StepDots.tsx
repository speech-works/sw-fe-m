import React, { useEffect } from "react";
import { Pressable, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import {
  duration,
  easing,
  makeStyles,
  spacing,
  spring,
  useMotion,
  useTheme,
} from "../../design-system";

/**
 * ============================================================================
 * STEP DOTS — progress that is also navigation
 * ----------------------------------------------------------------------------
 * Replaces three things that were saying one thing: "Step 2 of 6", "33%", and a
 * filled bar. Six dots with two filled carries the count AND the proportion in
 * a quarter of the height, and every dot behind you is a tap target — so going
 * back three answers is one tap rather than three screens.
 *
 * ── WHAT THE UNFILLED DOTS MUST NEVER DO ────────────────────────────────────
 * Dots imply you can jump FORWARD as well as back, and you cannot: a later
 * question may not exist yet (Act 1 skips one when there is nothing to rank)
 * and its answer certainly does not. So the ones ahead are inert, unstyled as
 * targets, and excluded from accessibility — the affordance has to be honest
 * or the first forward tap teaches people the whole row is decorative.
 *
 * ── THE POP ─────────────────────────────────────────────────────────────────
 * When somebody uses the BACK BUTTON, the dot they land on pops once. That is
 * the only moment the two controls are visibly the same system: the eye is led
 * from the thing you pressed to the status that changed, and the shortcut is
 * discovered as a side effect of using the obvious control. It does not fire on
 * a dot tap — you already know where you are looking.
 * ============================================================================
 */

interface Props {
  total: number;
  /** 1-based. */
  current: number;
  /**
   * Steps that are genuinely BEHIND us in the navigation stack, keyed by step
   * number. A step can be answered without being reachable — somebody resuming
   * onboarding lands mid-flow with nothing pushed behind them — and a dot that
   * looks tappable and is not teaches people the whole row is decorative.
   */
  reachable: Map<number, number>;
  /** Jump back to `step`. Only ever called with a step behind the current one. */
  onJump: (step: number) => void;
  /**
   * Set for one render when arrival was via the back BUTTON rather than a dot,
   * so the landing dot can acknowledge it.
   */
  popOnArrival?: boolean;
}

/** Collapsed dot, and the width the current one stretches to. */
const DOT = 6;
const DOT_WIDE = 22;

const StepDots: React.FC<Props> = ({
  total, current, reachable, onJump, popOnArrival,
}) => {
  const styles = useStyles();
  const { colors } = useTheme();
  const { reduced } = useMotion();

  // One driver for the whole row: which dot is popping, and how hard.
  const popAt = useSharedValue(-1);
  const pop = useSharedValue(0);

  useEffect(() => {
    if (!popOnArrival || reduced) return;
    popAt.value = current;
    // Snap to the popped size, then let the spring carry it home — the same
    // pattern the DS uses for a one-shot pop, and unlike a keyframe it can be
    // interrupted by a second press without restarting from zero.
    pop.value = 1;
    pop.value = withSpring(0, spring.bouncy);
  }, [popOnArrival, current, reduced, popAt, pop]);

  return (
    <View style={styles.row} accessibilityRole="progressbar">
      {Array.from({ length: total }, (_, i) => {
        const step = i + 1;
        const done = step < current;
        const now = step === current;
        // Filled says "answered". Pressable says "you can get back to it".
        // They are different facts and this is the one place they diverge.
        const canJump = done && reachable.has(step);
        return (
          <Dot
            key={step}
            index={step}
            done={done}
            now={now}
            popAt={popAt}
            pop={pop}
            reduced={reduced}
            colors={colors}
            styles={styles}
            onPress={canJump ? () => onJump(step) : undefined}
          />
        );
      })}
    </View>
  );
};

const Dot: React.FC<any> = ({
  index, done, now, popAt, pop, reduced, colors, styles, onPress,
}) => {
  const style = useAnimatedStyle(() => ({
    width: reduced
      ? now ? DOT_WIDE : DOT
      : withSpring(now ? DOT_WIDE : DOT, spring.gentle),
    backgroundColor: withTiming(
      done || now ? colors.action.primary : colors.surface.control,
      { duration: duration.base, easing: easing.out },
    ),
    transform: [{ scale: popAt.value === index ? 1 + pop.value * 0.7 : 1 }],
  }));

  // Only the dots behind you are controls. The rest are not pressable, carry no
  // role, and are hidden from assistive tech — see the note at the top.
  if (!onPress) return <Animated.View style={[styles.dot, style]} />;

  return (
    <Pressable
      onPress={onPress}
      hitSlop={{ top: 14, bottom: 14, left: 5, right: 5 }}
      accessibilityRole="button"
      accessibilityLabel={`Go back to question ${index}`}
    >
      <Animated.View style={[styles.dot, style]} />
    </Pressable>
  );
};

export default StepDots;

const useStyles = makeStyles((c) => ({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    height: DOT,
  },
  dot: {
    height: DOT,
    borderRadius: DOT / 2,
    backgroundColor: c.surface.control,
  },
}));
