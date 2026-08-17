import { useNavigation } from "@react-navigation/native";
import React from "react";
import { StyleSheet, View } from "react-native";
import { ROUTE_NAMES } from "../../../../constants/routes";
import PressableScale from "../../../../components/PressableScale";
import {
  Text,
  Icon,
  icons,
  useTheme,
  withAlpha,
  bestForeground,
  onColor,
  spacing,
  space,
  radius,
  fonts,
  PulseDot,
} from "../../../../design-system";
import { CTA_ICON } from "../../../../components/Dashboard/RecHeroCard";

/**
 * The level-1 invite card. It occupies the Level card's slot in the identity
 * grid until the user reaches level 2 — which is their SECOND completed
 * practice (level 2 = 18 XP, a practice grants 15; see sw-be-2 util/level.ts
 * and types/task.types.ts). From then on the real Level card renders here
 * forever, first appearing right after the level-up celebration and already
 * showing real progress, never a ring at 0%.
 *
 * WHY: on a brand-new account this half of Home was a ring stuck at 0% and the
 * only button below the fold was a shop door. Day one needs a free action.
 *
 * LANGUAGE: the vivid flood-card family (RecHeroCard / PromoCard) — a solid
 * accent fill, its AA-correct dark ink, ink-circle texture, and a solid
 * dark-island CTA — with the level card's own ANCHOR + HERO skeleton
 * (`levelAnchor` / `heroBlock` in this file's sibling `index.tsx`), so it
 * fits the identical half-width slot the real Level card already proves out.
 * The anchor row's dot trio nods to the "Learn · Try · Done" seed motif
 * without the label that made the first pass overflow — see the postmortem
 * below.
 *
 * POSTMORTEM (2026-08-17): the first build put an eyebrow, a two-line hero,
 * a labelled 3-dot row, AND a footer stat next to a full icon+text CTA pill
 * into a ~155pt slot — four stacked rows where the real Level card fits in
 * two (anchor, then hero+one meta line). "Learn · Try · Done" truncated
 * mid-word. This version holds to the same TWO-ROW budget as the card it
 * will become: anchor (dot trio + eyebrow) atop hero (one line) atop the CTA
 * alone on its own row, leading-aligned exactly as RecHeroCard's doc
 * describes for "no price node" — never sharing a row with another text run.
 */

/** Anchor-row dot diameter — sized so the 3-dot trio occupies the same width
 *  budget as the 34px level ring it stands in for (27 + 2 gaps ≈ 31px). */
const DOT = 9;
/** Inactive dots are the ink at a whisper, matching the blob texture math. */
const DOT_IDLE_ALPHA = 0.35;

const InviteCard: React.FC = () => {
  const navigation = useNavigation<any>();
  const { colors, scheme } = useTheme();
  const isDark = scheme === "dark";

  // The one place the card's hue is decided.
  const fill = colors.action.primary;
  const ink = colors.action.onPrimary;

  // Primary action = a solid dark island on the bright fill — RecHeroCard's
  // exact recipe, chosen by measurement so the island reads as a SHAPE against
  // whatever this fill is, in both schemes.
  const islandBg = isDark
    ? colors.action.secondary
    : bestForeground(fill, [colors.surface.inverse, ink]);
  const islandInk = isDark ? colors.action.onSecondary : onColor(islandBg, colors);

  const jumpIn = () => {
    // Root -> the Explore TAB -> its "Explore" screen. Must go through "Root"
    // (the app-level Stack.Screen wrapping BottomTabNavigator) — a bare
    // navigate("ExploreStack", …) resolves to the DIFFERENT "ExploreStack"
    // registered as a sibling of "Root" in AppNavigator.tsx, which pushes a
    // second, orphaned ExploreStackNavigator outside the tab navigator
    // entirely, so CustomTabBar never renders around it. Same door
    // DonePractice's "Explore More" already opens correctly.
    navigation.navigate("Root", {
      screen: ROUTE_NAMES.EXPLORE,
      params: { screen: "Explore", params: { scrollToJumpIn: true } },
    });
  };

  return (
    <PressableScale
      onPress={jumpIn}
      style={[styles.card, { backgroundColor: fill }]}
      accessibilityRole="button"
      accessibilityLabel="Start here. Jump in to your first practice."
    >
      {/* Ink-circle texture, ONE only and pushed to the bottom corner — the
          first pass put it top-right, directly behind the eyebrow it now
          shares a row with, which read as a smudge rather than depth. */}
      <View
        style={[styles.blob, { backgroundColor: withAlpha(ink, 0.1) }]}
        pointerEvents="none"
      />

      <View style={styles.inner}>
        {/* ── Anchor row — mirrors `levelAnchor`: ring-sized mark + label ── */}
        <View style={styles.anchor}>
          <View style={styles.dots}>
            <PulseDot color={ink} size={DOT} />
            <View style={[styles.dot, { backgroundColor: withAlpha(ink, DOT_IDLE_ALPHA) }]} />
            <View style={[styles.dot, { backgroundColor: withAlpha(ink, DOT_IDLE_ALPHA) }]} />
          </View>
          <Text variant="eyebrow" color={ink} style={styles.anchorLabel}>
            First practice
          </Text>
        </View>

        {/* ── Hero block — mirrors `heroBlock`: one hero line, one meta row.
            The meta row IS the CTA here, alone, leading-aligned — the same
            rule RecHeroCard documents for "no price node": the pill only
            ever shares a row with plain text at full card width, not half. */}
        <View style={styles.heroBlock}>
          <Text variant="h2" color={ink} numberOfLines={1} style={styles.hero}>
            Start here.
          </Text>
          <View style={styles.ctaRow}>
            <View style={[styles.cta, { backgroundColor: islandBg }]}>
              <Icon name={icons.play} size={CTA_ICON} color={islandInk} />
              <Text variant="title" color={islandInk}>
                Jump in
              </Text>
            </View>
          </View>
        </View>
      </View>
    </PressableScale>
  );
};

export default InviteCard;

const styles = StyleSheet.create({
  // The identity grid's card shell (flex sibling of the avatar card), minus the
  // hairline border — a saturated flood draws its own edge in both schemes.
  card: {
    flex: 1,
    minHeight: 138,
    padding: spacing.lg,
    borderRadius: radius.card,
    overflow: "hidden",
  },
  blob: {
    position: "absolute",
    bottom: -30,
    right: -22,
    width: 92,
    height: 92,
    borderRadius: radius.full,
  },
  inner: {
    flex: 1,
    justifyContent: "space-between",
  },
  anchor: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: spacing.sm,
  },
  dots: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xxs,
  },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: radius.full,
  },
  anchorLabel: {
    letterSpacing: 0.6,
  },
  heroBlock: {
    gap: spacing.xs,
  },
  hero: {
    letterSpacing: -0.3,
    fontFamily: fonts.extrabold,
  },
  ctaRow: {
    flexDirection: "row",
    justifyContent: "flex-start",
    marginTop: spacing.xs,
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.inlineGap,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
});
