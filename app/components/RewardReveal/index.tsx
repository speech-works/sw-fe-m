import React, { useEffect, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  type SharedValue,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Svg, { Defs, Rect, RadialGradient, Stop } from "react-native-svg";
import { UserAvatar } from "../UserAvatar";
import { PART_LABELS, slotOfPart } from "../../assets/avatar/registry";
import { normalizeManifest, type AvatarManifest } from "../../types/avatar";
import {
  borderWidth,
  duration,
  easing,
  radius,
  spacing,
  spring,
  Text,
  useMotion,
  useTheme,
  useThemeContext,
  withAlpha,
  haptics,
  Gradient,
} from "../../design-system";

/**
 * "Here is what you just earned" — the reward reveal.
 *
 * A block, not a modal: it renders INSIDE whatever moment already owns the
 * screen (today the level-up takeover). Two live native Modals freeze touch
 * input on iOS, so a reward popup can never be its own second modal stacked
 * over the celebration that triggered it.
 *
 * Every card is the user's OWN avatar wearing the new piece, not a catalog
 * thumbnail — the same rule the Studio grid follows, and the reason "Try them
 * on" is a believable offer rather than a link to go hunting.
 */

/** Cards past this stay unnamed behind an "and N more" line. Four is two rows
 *  of two, which is as much as reads as a gift rather than a haul.
 *  Ordinary level-ups grant one or two pieces; only a multi-level jump or a
 *  stage crossing overflows. */
const MAX_CARDS = 4;

/** Beat between cards landing.
 *
 * NOT `stagger.step` (45ms). That token is tuned for lists of many rows, where
 * the point is that the group arrives as one thing and the cap keeps a long
 * list from crawling. Here there are one to four hero items and the point is
 * the opposite: you should see each one land. 80ms is the top of the usable
 * range — past that it stops reading as one gesture. */
const REVEAL_STEP = 80;

/**
 * When a card has ARRIVED, measured off its own spring rather than guessed.
 *
 * `spring.bouncy` first crosses its rest value at ~141 ms and peaks at ~206 ms,
 * so this is the frame the card reads as landed. The haptic tick and the shine
 * both fire here: firing at the card's start would tick as it leaves, which is
 * the wrong end of the movement and feels a beat early every time.
 */
const LAND_MS = 140;

/** How long the highlight takes to cross one card. */
const SHINE_MS = 460;

/** Band width. Narrow enough to read as a glint rather than a wash. */
const SHINE_W = 26;

/**
 * Sized for the NARROWEST phone, not the widest.
 *
 * The host modal is `width: 100%` inside a screen with 24pt gutters and takes
 * another 24pt of its own padding, so on a 360pt Android the cards get 264pt,
 * not the 332 a 380-wide modal suggests. Three 80s and two 8pt gaps come to
 * 256 — the last row width that survives there.
 */
const CARD_WIDTH = 80;
const AVATAR_SIZE = 60;

/** Rows are chunked explicitly instead of letting flex-wrap decide, because
 *  wrap would put four cards on a 3 + 1 and the orphan reads as a mistake. */
function rowsOf(ids: string[]): string[][] {
  const perRow = ids.length === 4 ? 2 : 3;
  const rows: string[][] = [];
  for (let i = 0; i < ids.length; i += perRow) rows.push(ids.slice(i, i + perRow));
  return rows;
}

interface RewardCardProps {
  manifest: AvatarManifest;
  partId: string;
  index: number;
  /** ms before the first card lands, so the host modal settles first. */
  startDelay: number;
  reduced: boolean;
}

const RewardCard: React.FC<RewardCardProps> = ({
  manifest,
  partId,
  index,
  startDelay,
  reduced,
}) => {
  const { colors } = useTheme();
  const t = useSharedValue(0);
  const shine = useSharedValue(0);
  const label = PART_LABELS[partId] ?? partId;

  useEffect(() => {
    const delay = startDelay + index * REVEAL_STEP;

    // One tick per card, on the frame it lands. Deliberately NOT gated on
    // reduced motion: someone who has switched movement off has not asked for
    // less feedback, and on a phone this is most of what makes four pops feel
    // like four things arriving.
    const tick = setTimeout(() => haptics.light(), delay + (reduced ? 0 : LAND_MS));

    if (reduced) {
      t.value = withDelay(delay, withTiming(1, { duration: duration.base }));
      return () => clearTimeout(tick);
    }
    // Celebration spring: the small overshoot IS the reward beat. Cards are
    // never interrupted mid-flight (the modal is already open and they only
    // play once), so physics costs nothing here.
    t.value = withDelay(delay, withSpring(1, spring.bouncy));
    // The highlight crosses as the card settles, so the two read as one event.
    shine.value = withDelay(
      delay + LAND_MS,
      withTiming(1, { duration: SHINE_MS, easing: easing.inOut }),
    );
    return () => {
      clearTimeout(tick);
      cancelAnimation(t);
      cancelAnimation(shine);
    };
  }, [t, shine, index, startDelay, reduced]);

  const style = useAnimatedStyle(() => {
    // Identity transform rather than an omitted key — a worklet that returns
    // different SHAPES on different passes crashes Reanimated's style merge
    // ("Cannot set property 'scale' of undefined"). Same rule as
    // OnboardingCelebration.
    if (reduced) {
      return { opacity: t.value, transform: [{ translateY: 0 }, { scale: 1 }] };
    }
    return {
      // Opacity outruns the spring so the card is solid by the time it settles,
      // rather than still fading while it bounces.
      opacity: Math.min(1, t.value * 1.6),
      transform: [
        { translateY: interpolate(t.value, [0, 1], [10, 0]) },
        // Never from scale(0) — 0.86 still has a shape.
        { scale: 0.86 + t.value * 0.14 },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.card,
        {
          backgroundColor: withAlpha(colors.action.primary, 0.1),
          borderColor: withAlpha(colors.action.primary, 0.35),
        },
        style,
      ]}
      accessibilityLabel={`${label}, unlocked`}
    >
      <UserAvatar manifest={manifest} size={AVATAR_SIZE} animate={false} />
      {/* Two lines, never an ellipsis — a piece whose name is cut in half is a
          piece the user cannot go and find. */}
      <Text variant="caption" color="primary" numberOfLines={2} center>
        {label}
      </Text>
      {!reduced && <Shine progress={shine} />}
    </Animated.View>
  );
};

/**
 * The highlight that crosses a card once as it lands.
 *
 * This is the reward-reveal vocabulary people already know from games, minus
 * the part that would be a lie here: no rarity tint, no repeat, no idle
 * shimmer. It says "this one is new", not "this one is rare", because the app
 * has no rarity to claim.
 *
 * Clipped by the card's own `overflow: hidden`, and transform-only so it never
 * touches layout.
 */
const Shine: React.FC<{ progress: SharedValue<number> }> = ({ progress }) => {
  const { scheme, colors } = useThemeContext();

  /*
   * THE HIGHLIGHT CANNOT BE WHITE IN BOTH SCHEMES.
   *
   * A glint is a specular highlight, so white is the obvious fill, and on the
   * dark card it shifts luminance by 18% and reads immediately. On the light
   * card, which sits at (255,235,218), the same band shifts it by 1.7%. That is
   * not a subtle effect, it is an absent one: you cannot make a near-white
   * surface lighter.
   *
   * So light mode sweeps the brand amber instead. On a card already tinted with
   * it, a stronger pass of the same hue reads as light moving across rather than
   * as a stripe of some other colour.
   */
  const band: readonly [string, string, string] =
    scheme === "light"
      ? [
          withAlpha(colors.action.primary, 0),
          withAlpha(colors.action.primary, 0.38),
          withAlpha(colors.action.primary, 0),
        ]
      : ["#FFFFFF00", "#FFFFFF3D", "#FFFFFF00"];

  const style = useAnimatedStyle(() => ({
    // Travel is card width plus the band's own width, so it starts and ends
    // fully outside rather than appearing and vanishing at the edges.
    transform: [
      { translateX: interpolate(progress.value, [0, 1], [-SHINE_W, CARD_WIDTH + SHINE_W]) },
      { rotate: "18deg" },
    ],
    // Fades at both ends: a band that pops on at full strength reads as a glitch.
    opacity: interpolate(progress.value, [0, 0.15, 0.85, 1], [0, 1, 1, 0]),
  }));

  return (
    <Animated.View style={[styles.shine, style]} pointerEvents="none">
      <Gradient
        colors={band}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
};

interface RewardRevealProps {
  /** The user's saved avatar. Null is fine — it normalizes to the default, which
   *  is exactly what a brand-new account is wearing. */
  manifest?: AvatarManifest | null;
  /** Newly unlocked part ids, in unlock order. */
  partIds: string[];
  /** ms before the first card lands. Defaults to just after a modal's enter. */
  startDelay?: number;
}

export const RewardReveal: React.FC<RewardRevealProps> = ({
  manifest,
  partIds,
  startDelay = 220,
}) => {
  const { colors } = useTheme();
  const { reduced } = useMotion();

  const base = useMemo(() => normalizeManifest(manifest), [manifest]);
  const shown = partIds.slice(0, MAX_CARDS);
  const overflow = partIds.length - shown.length;

  /** One preview manifest per card: the user's avatar with ONLY this slot
   *  swapped, so the reward is shown on the face they actually own. */
  const previews = useMemo(() => {
    const map = new Map<string, AvatarManifest>();
    shown.forEach((id) => {
      const slot = slotOfPart(id);
      map.set(
        id,
        slot ? { ...base, parts: { ...base.parts, [slot]: id } } : base,
      );
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base, shown.join(",")]);

  if (!partIds.length) return null;

  return (
    <View style={styles.wrap}>
      {!reduced && <Bloom color={colors.action.primary} delay={startDelay} />}
      <View style={styles.headingRow}>
        <View style={[styles.rule, { backgroundColor: colors.border.hairline }]} />
        <Text variant="label" color="secondary">
          New to wear
        </Text>
        <View style={[styles.rule, { backgroundColor: colors.border.hairline }]} />
      </View>

      {rowsOf(shown).map((row, r) => (
        <View key={r} style={styles.cards}>
          {row.map((id) => (
            <RewardCard
              key={id}
              manifest={previews.get(id) as AvatarManifest}
              partId={id}
              // Stagger runs across the whole set, not per row, so a two-row
              // reveal still lands as one continuous gesture.
              index={shown.indexOf(id)}
              startDelay={startDelay}
              reduced={reduced}
            />
          ))}
        </View>
      ))}

      {overflow > 0 && (
        <MoreLine count={overflow} delay={startDelay + shown.length * REVEAL_STEP} />
      )}
    </View>
  );
};

/**
 * A soft warm glow behind the cards, blooming with the first one and settling
 * to a low steady value.
 *
 * Gives the row a light source. Without it the cards sit flat on the modal and
 * the whole block reads as a list, which is what it must not be. A real radial
 * (SVG) rather than a rounded View: a hard-edged disc at this size reads as a
 * shape someone forgot to finish.
 */
const Bloom: React.FC<{ color: string; delay: number }> = ({ color, delay }) => {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(delay, withTiming(1, { duration: 900, easing: easing.out }));
    return () => cancelAnimation(t);
  }, [t, delay]);
  const style = useAnimatedStyle(() => ({
    // Overshoots its resting brightness and eases back, so it reads as a flash
    // of light settling rather than a panel fading up.
    opacity: interpolate(t.value, [0, 0.35, 1], [0, 1, 0.55]),
    transform: [{ scale: interpolate(t.value, [0, 1], [0.72, 1]) }],
  }));

  return (
    <Animated.View style={[styles.bloom, style]} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          <RadialGradient id="rewardBloom" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={color} stopOpacity="0.30" />
            <Stop offset="0.55" stopColor={color} stopOpacity="0.11" />
            <Stop offset="1" stopColor={color} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        {/* A rect, never a zero-extent shape: an objectBoundingBox gradient on
            an element with no area is a hard Android process death. */}
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#rewardBloom)" />
      </Svg>
    </Animated.View>
  );
};

/** "and N more" — arrives on the beat after the last card, so the count reads as
 *  part of the same reveal instead of static text that was always there. Opacity
 *  only, which is already the reduced-motion-safe form. */
const MoreLine: React.FC<{ count: number; delay: number }> = ({ count, delay }) => {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(
      delay,
      withTiming(1, { duration: duration.reveal, easing: easing.out }),
    );
    return () => cancelAnimation(t);
  }, [t, delay]);
  const style = useAnimatedStyle(() => ({ opacity: t.value }));

  return (
    <Animated.View style={style}>
      <Text variant="caption" color="secondary" center>
        {`and ${count} more`}
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    alignItems: "center",
    gap: spacing.md,
  },
  bloom: {
    position: "absolute",
    // Bleeds past the block on every side; a glow that stops at the content
    // edge is a rectangle, not a light.
    left: -spacing["3xl"],
    right: -spacing["3xl"],
    top: -spacing.xl,
    bottom: -spacing.xl,
  },
  headingRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "stretch",
    gap: spacing.sm,
  },
  rule: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  cards: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.sm,
  },
  card: {
    width: CARD_WIDTH,
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.input,
    borderWidth: borderWidth.thin,
    // Clips the highlight band to the card. Also clips the avatar's 8-unit
    // bleed, which sits inside the padding, so nothing visible is lost.
    overflow: "hidden",
  },
  shine: {
    position: "absolute",
    top: -CARD_WIDTH,
    left: 0,
    width: SHINE_W,
    // Tall enough that an 18deg tilt still covers the card corner to corner.
    height: CARD_WIDTH * 3,
  },
});
