import React, { useEffect, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { RewardReveal } from "../../../../../components/RewardReveal";
import {
  CelebrationLight,
  CelebrationBurst,
} from "../../../../../components/CelebrationLight";
import {
  partsUnlockedBetween,
  stageCrossedBetween,
} from "../../../../../assets/avatar/registry";
import type { AvatarManifest } from "../../../../../types/avatar";
import {
  size,
  AnimatedModal,
  Button,
  Icon,
  icons,
  radius,
  spacing,
  spring,
  Text,
  useMotion,
  useTheme,
  haptics,
  duration,
} from "../../../../../design-system";

interface LevelUpTakeoverProps {
  visible: boolean;
  /** The level they were on before this completion. Needed as well as the new
   *  one because a single practice can carry more than one level, and the
   *  reward list has to cover every rung it passed. */
  fromLevel: number;
  newLevel: number;
  stageTitle: string | null;
  /** The user's saved avatar — the reward cards are drawn wearing it. */
  manifest?: AvatarManifest | null;
  /**
   * The single exit path — backdrop tap and the CTA both route through it.
   * Deliberately the Phase-5 seam: reward-grant chaining hooks here.
   */
  onClose: () => void;
  /** Dismiss and open the Avatar Studio. Omit and the offer is not made. */
  onTryOn?: () => void;
}

/**
 * The level-up celebration — the one moment a level is announced in-app.
 * Same content grammar as BreakthroughModal (icon disc + eyebrow + h2 + body +
 * full-width CTA), riding the DS AnimatedModal with `exclusive` so it defers
 * while any other native modal (e.g. the Reminder sheet) is up — never two
 * live native Modals. No faces here (one-face rule).
 *
 * When the level opened new wardrobe it also carries the reward reveal, INLINE
 * rather than as a follow-up popup: a second native Modal over this one is the
 * iOS touch-freeze, and a level-up that has to be dismissed twice stops being
 * a gift. The gear is the pitch, so it goes above the CTA, not behind it.
 *
 * CELEBRATION HAS TWO TIERS, and the reason is arithmetic. A level costs
 * `18(level-1)²` XP against an 800/week cap, so a committed user sees five or
 * six level-ups in their first WEEK and then waits weeks, later months, for the
 * next. Spending the loudest treatment on level 3 leaves nothing for level 16.
 * So an ordinary level gets the disc pop, the card springs, the shine and the
 * haptics; a STAGE crossing additionally lights the badge, fires the shockwave
 * and rains confetti, which is what makes a chapter change feel like one.
 *
 * The confetti is deliberately NOT on every level. DonePractice already bursts
 * confetti on every completed practice, about a second before this opens, so a
 * second helping would be a signal that does not mean "you levelled". Held for
 * the crossing, it means exactly that.
 */
export const LevelUpTakeover: React.FC<LevelUpTakeoverProps> = ({
  visible,
  fromLevel,
  newLevel,
  stageTitle,
  manifest,
  onClose,
  onTryOn,
}) => {
  const { colors } = useTheme();
  const { reduced } = useMotion();

  // Derived, not granted: a part is "earned" the moment the level is reached,
  // so there is nothing to write anywhere. Levelling twice in one session lists
  // both rungs.
  const unlocked = useMemo(
    () => partsUnlockedBetween(fromLevel, newLevel),
    [fromLevel, newLevel],
  );
  const hasRewards = unlocked.length > 0;
  const grand = stageCrossedBetween(fromLevel, newLevel);

  /*
   * BOTH EFFECTS BELOW ARE GATED ON `visible`, NOT ON MOUNT.
   *
   * This component is rendered by DonePractice from the moment that screen
   * appears, roughly 900 ms before the takeover is armed. AnimatedModal only
   * mounts its CHILDREN when it presents, so the reveal's own animations time
   * themselves correctly; these two live out here in the parent and would
   * otherwise fire on the success screen, buzzing the phone before anything
   * happened and finishing the disc's pop while it was still off screen.
   */
  useEffect(() => {
    if (visible) haptics.success();
  }, [visible]);

  const pop = useSharedValue(0);
  useEffect(() => {
    if (!visible) {
      pop.value = 0;
      return;
    }
    // Lands just after the modal's own spring opens, so the disc reads as
    // arriving IN the card rather than being part of its background.
    if (reduced) {
      pop.value = withDelay(120, withTiming(1, { duration: duration.base }));
      return;
    }
    pop.value = withDelay(120, withSpring(1, spring.bouncy));
    return () => cancelAnimation(pop);
  }, [pop, reduced, visible]);

  const discStyle = useAnimatedStyle(() => {
    // Identity transform, not an omitted key — see the note in RewardReveal.
    if (reduced) return { opacity: pop.value, transform: [{ scale: 1 }] };
    return {
      opacity: Math.min(1, pop.value * 1.6),
      // Never from scale(0); 0.7 is small enough to read as a pop.
      transform: [{ scale: 0.7 + pop.value * 0.3 }],
    };
  });

  return (
    <AnimatedModal
      visible={visible}
      onClose={onClose}
      maxWidth={380}
      exclusive
      // Clips the light rig and the confetti to the card's rounded edge, so a
      // celebration that belongs to one card never rains on the whole screen.
      contentStyle={styles.card}
    >
      <View style={styles.content}>
        {grand && (
          // Behind the disc, not behind the whole modal: the light should look
          // like it comes off the badge. `bloom`, not the onboarding screen's
          // god-rays — twelve hard-edged wedges dimmed to survive under text
          // read as clipart, not as light. See CelebrationLight's header.
          <View style={styles.lightLayer} pointerEvents="none">
            <CelebrationLight
              mode="bloom"
              reduced={reduced}
              color={colors.action.primary}
              burstSize={230}
              haloSize={116}
              intensity={0.9}
              gradientId="levelUpBloom"
            />
          </View>
        )}

        <Animated.View
          style={[styles.iconDisc, { backgroundColor: colors.action.primary }, discStyle]}
        >
          <Icon name={icons.levelUp} size={size.iconLg} color={colors.action.onPrimary} />
        </Animated.View>

        <Text variant="label" color="secondary" center>
          Your character grew
        </Text>
        <Text variant="h2" color="primary" center>
          {stageTitle ?? `Level ${newLevel}`}
        </Text>
        {/* The number is the subtitle to a stage NAME. Without a stage it is
            already the headline, and printing it twice read as a bug. */}
        {stageTitle ? (
          <Text variant="caption" color="secondary" center>
            Level {newLevel}
          </Text>
        ) : null}

        {hasRewards ? (
          // The reward block replaces the encouragement line rather than
          // stacking under it. Both say "this was worth doing"; the one that
          // shows you the hat says it better, and two of them makes a tall
          // modal out of a short moment.
          <RewardReveal manifest={manifest} partIds={unlocked} />
        ) : (
          <Text variant="body" color="secondary" center style={styles.message}>
            Every practice makes you stronger.
          </Text>
        )}

        {grand && visible && (
          // Last child, so it falls IN FRONT of the cards. Clipped by the
          // card's own overflow, so nothing rains onto the rest of the screen.
          <CelebrationBurst
            reduced={reduced}
            colors={[
              colors.action.primary,
              colors.accent.warning,
              colors.accent.info,
              colors.accent.purple,
              colors.accent.danger,
            ]}
          />
        )}

        <View style={styles.actions}>
          {hasRewards && onTryOn ? (
            <>
              <Button
                label={unlocked.length === 1 ? "Try it on" : "Try them on"}
                onPress={onTryOn}
              />
              <Button label="Keep going" variant="ghost" onPress={onClose} />
            </>
          ) : (
            <Button label="Keep going" onPress={onClose} />
          )}
        </View>
      </View>
    </AnimatedModal>
  );
};

const styles = StyleSheet.create({
  card: {
    overflow: "hidden",
  },
  // Centred, gap-driven stack — the shared dark-modal content grammar.
  content: {
    alignItems: "center",
    gap: spacing.md,
  },
  /** Square, and centred on the icon disc rather than on the modal, so the rays
   *  stay circular and radiate from the badge. Sized so the rays fade out ABOVE
 *  the stage name: light behind a headline is atmosphere, light across one is
 *  a contrast problem. */
  lightLayer: {
    position: "absolute",
    top: 32 - 115,
    left: 0,
    right: 0,
    height: 230,
    alignItems: "center",
    justifyContent: "center",
  },
  iconDisc: {
    width: 64,
    height: 64,
    borderRadius: radius.input,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  message: {
    lineHeight: 22,
  },
  actions: {
    width: "100%",
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
});
