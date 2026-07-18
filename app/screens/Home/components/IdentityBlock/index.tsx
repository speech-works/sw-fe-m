import { useFocusEffect, useNavigation } from "@react-navigation/native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { getLevelStage, LevelStage } from "../../../../api/users";
import PressableScale from "../../../../components/PressableScale";
import { useUserStore } from "../../../../stores/user";
import {
  useTheme,
  spacing,
  radius,
  Text,
  Icon,
  icons,
  Gradient,
  fonts,
} from "../../../../design-system";
import { useStaminaEstimate } from "./useStaminaEstimate";
import { UserAvatar } from "../../../../components/UserAvatar";
import { normalizeManifest } from "../../../../types/avatar";

/**
 * Home's top identity block — the original arrangement: the big ENERGY meter
 * floats on the canvas up top ("can I practice now?" is the actionable signal),
 * and the LEVEL sits in a card below it (with room for a sibling card beside
 * it). Horizontal bars only (no rings). Raw XP numbers live one tap away on the
 * Achievements detail (progressive disclosure). Level + stamina data flow is
 * ported verbatim from the legacy ResourceStats.
 */
export const IdentityBlock: React.FC = () => {
  const { colors, elevation } = useTheme();
  const navigation = useNavigation<any>();
  const { user, fetchUser } = useUserStore();

  // Force-refresh on focus so level/energy are fresh after an activity (frozen).
  useFocusEffect(
    useCallback(() => {
      fetchUser();
    }, [fetchUser]),
  );

  const [levelStage, setLevelStage] = useState<LevelStage | null>(null);
  const [isLoadingLevel, setIsLoadingLevel] = useState(true);

  useEffect(() => {
    if (user) {
      setIsLoadingLevel(true);
      getLevelStage()
        .then(setLevelStage)
        .catch((e) => console.error(e))
        .finally(() => setIsLoadingLevel(false));
    } else {
      setIsLoadingLevel(false);
    }
  }, [user?.id, user?.level]);

  const userLevel = levelStage?.level || user?.level || 1;
  const xpIntoLevel = Math.max(
    0,
    (levelStage?.totalXp ?? user?.totalXp ?? 0) - (levelStage?.currentLevelXpFloor || 0),
  );
  const xpForNextLevel = Math.max(
    1,
    (levelStage?.nextLevelXpCeiling || 100) - (levelStage?.currentLevelXpFloor || 0),
  );
  // % progress (not raw XP — those stay one tap away) + the next-level teaser.
  const levelPct = levelStage
    ? Math.min(100, Math.round((xpIntoLevel / xpForNextLevel) * 100))
    : 0;

  const { staminaPercentage, rechargeTimeLeft } = useStaminaEstimate(user ?? null);

  // The avatar's own backdrop colour tints its card — each user's identity card
  // glows in their world. (+ alpha suffix = a low-opacity wash, not a fill.)
  const avatarBg = useMemo(
    () => normalizeManifest(user?.avatarManifest).colors.bg,
    [user?.avatarManifest],
  );

  return (
    <View style={styles.container}>
      {/* 1. Energy — the hero card of the identity block (same elevated + glow +
          sheen language as the level/avatar pair, but full-width and primary). */}
      <View
        style={[
          styles.energyCard,
          { backgroundColor: colors.surface.elevated, borderColor: colors.border.default },
          elevation.e2,
        ]}
      >
        <Gradient token="brand" style={[styles.glow, styles.glowWarm]} pointerEvents="none" />
        <Gradient token="sheen" style={styles.sheen} pointerEvents="none" />

        <View style={styles.rowHeader}>
          <View style={styles.energyHeaderLeft}>
            <Gradient token="brand" style={styles.energyDisc} pointerEvents="none">
              <Icon name={icons.energy} size={16} color={colors.action.onPrimary} />
            </Gradient>
            <Text variant="title" color="primary">
              Energy
            </Text>
          </View>
          <Text variant="h2" color="accent">
            {staminaPercentage}%
          </Text>
        </View>

        {/* Gradient meter with a glossy top highlight — fed the SAME rounded
            value as the % label so fill and number can never disagree. */}
        <View style={[styles.meterTrack, { backgroundColor: colors.surface.control }]}>
          <View style={[styles.meterFill, { width: `${staminaPercentage}%` }]}>
            <Gradient token="brand" style={StyleSheet.absoluteFill} pointerEvents="none" />
            <Gradient token="sheen" style={styles.meterGloss} pointerEvents="none" />
          </View>
        </View>

        <View style={styles.energyFooter}>
          {!user?.isPaid ? (
            <PressableScale
              haptic={false}
              onPress={() => navigation.navigate("PremiumModal")}
              accessibilityRole="button"
              accessibilityLabel="Upgrade energy"
            >
              <Text variant="caption" color={colors.text.link}>
                Upgrade Energy
              </Text>
            </PressableScale>
          ) : staminaPercentage === 100 ? (
            <Text variant="caption" color="tertiary">
              Fully Charged
            </Text>
          ) : (
            <Text variant="caption" color="tertiary">
              {rechargeTimeLeft ? `~${rechargeTimeLeft} until full` : "Recharging…"}
            </Text>
          )}
        </View>
      </View>

      {/* 2. Level card + avatar card (below energy) — the two-card identity row.
          Each card layers an ambient tinted glow (depth + immersion) under its
          content, lifted with the DS elevation scale and finished with a top
          sheen for a "lit from above" edge. */}
      <View style={styles.grid}>
        <PressableScale
          onPress={() =>
            navigation.navigate("ProgressDetail", { scrollTo: "achievements" })
          }
          style={[
            styles.card,
            { backgroundColor: colors.surface.elevated, borderColor: colors.border.default },
            elevation.e2,
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Level ${userLevel}${
            levelStage?.title ? `, ${levelStage.title}` : ""
          }. View achievements.`}
        >
          {/* warm progression glow + top sheen */}
          <Gradient token="brand" style={[styles.glow, styles.glowWarm]} pointerEvents="none" />
          <Gradient token="sheen" style={styles.sheen} pointerEvents="none" />

          <View style={styles.cardInner}>
            {/* top anchor: the level as a gradient chip ("9 · LEVEL") */}
            <View style={[styles.chip, { backgroundColor: colors.action.primaryTint }]}>
              <Gradient token="brand" style={styles.chipBadge} pointerEvents="none">
                <Text variant="caption" color={colors.action.onPrimary} style={styles.chipNum} numberOfLines={1}>
                  {userLevel}
                </Text>
              </Gradient>
              <Text variant="label" color="accent" style={styles.chipLabel}>
                LEVEL
              </Text>
            </View>

            {/* hero: the stage identity */}
            <View style={styles.heroBlock}>
              <Text variant="h2" color="primary" numberOfLines={1} style={styles.heroName}>
                {isLoadingLevel && !levelStage
                  ? "Syncing…"
                  : levelStage?.title ?? `Level ${userLevel}`}
              </Text>
              <View style={styles.baseline}>
                <Text variant="caption" color="tertiary" numberOfLines={1}>
                  Level {userLevel + 1} next
                </Text>
                <Text variant="caption" style={[styles.pct, { color: colors.gamification.xp }]}>
                  {levelPct}%
                </Text>
              </View>
            </View>
          </View>

          {/* full-bleed progress bar hugging the bottom edge — structural, glowing */}
          <View style={[styles.fbTrack, { backgroundColor: colors.surface.control }]}>
            <View style={[styles.fbFillWrap, { width: `${levelPct}%` }]}>
              <Gradient token="meadow" style={StyleSheet.absoluteFill} pointerEvents="none" />
            </View>
          </View>
        </PressableScale>

        {/* Avatar card — the character the user owns. Always shows a REAL
            avatar (null manifest renders the default), never an empty slot;
            the caption carries the create-vs-edit state instead. The card glows
            in the avatar's own backdrop colour, and the character gently floats. */}
        <PressableScale
          onPress={() => navigation.navigate("AvatarStudio")}
          style={[
            styles.card,
            { backgroundColor: colors.surface.elevated, borderColor: colors.border.default },
            elevation.e2,
          ]}
          accessibilityRole="button"
          accessibilityLabel={
            user?.avatarManifest
              ? "Your avatar. Open the avatar studio."
              : "Create your avatar."
          }
        >
          <Gradient
            colors={[`${avatarBg}4D`, `${avatarBg}00`]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.glow}
            pointerEvents="none"
          />
          <Gradient token="sheen" style={styles.sheen} pointerEvents="none" />

          <View style={styles.cardInner}>
            {/* top anchor: the character portrait (hero) + an edit affordance */}
            <View style={styles.avatarRow}>
              <UserAvatar manifest={user?.avatarManifest} size={52} animate />
              <View style={[styles.affordance, { backgroundColor: colors.surface.control }]}>
                <Icon name={icons.chevronRight} size={16} color={colors.text.secondary} />
              </View>
            </View>

            {/* nameplate */}
            <View style={styles.heroBlock}>
              <Text variant="h2" color="primary" numberOfLines={1} style={styles.heroName}>
                Avatar
              </Text>
              <Text variant="caption" color="secondary" numberOfLines={1}>
                {user?.avatarManifest ? "View profile" : "Create yours"}
              </Text>
            </View>
          </View>

          {/* full-bleed accent strip in the avatar's own colour — mirrors the
              level card's progress bar so the pair reads as siblings. */}
          <View style={styles.fbTrack}>
            <Gradient
              colors={[avatarBg, `${avatarBg}00`]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
          </View>
        </PressableScale>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  // Energy hero card — the identity block's primary, full-width surface.
  energyCard: {
    padding: spacing.lg,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    gap: spacing.md,
  },
  rowHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  energyHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  energyFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  energyDisc: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  meterTrack: {
    height: 18,
    borderRadius: radius.full,
    overflow: "hidden",
  },
  meterFill: {
    height: "100%",
    borderRadius: radius.full,
    overflow: "hidden",
  },
  // glossy top highlight on the fill — the "charged" sheen
  meterGloss: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 7,
  },
  // Grid row that holds the level card — flex children so a sibling card can
  // slot in beside it (each becomes half-width) without any restyle.
  grid: {
    flexDirection: "row",
    gap: spacing.lg,
  },
  card: {
    flex: 1,
    minHeight: 128,
    padding: spacing.lg,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  // Ambient tinted wash behind the card content (immersion + depth).
  glow: {
    ...StyleSheet.absoluteFillObject,
  },
  glowWarm: {
    opacity: 0.13,
  },
  // "Lit from above" top edge — a very soft white sheen.
  sheen: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 54,
  },
  // The content column: top anchor pinned up top, hero/nameplate at the bottom.
  cardInner: {
    flex: 1,
    justifyContent: "space-between",
  },
  // ── level card ──
  chip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: radius.full,
    paddingRight: spacing.sm,
    paddingLeft: 3,
    paddingVertical: 3,
    gap: spacing.xs,
  },
  chipBadge: {
    width: 20,
    height: 20,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  chipNum: {
    fontFamily: fonts.extrabold,
  },
  chipLabel: {
    letterSpacing: 0.6,
  },
  heroBlock: {
    gap: spacing.xs,
  },
  heroName: {
    letterSpacing: -0.3,
    fontFamily: fonts.extrabold,
  },
  baseline: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  pct: {
    fontFamily: fonts.bold,
  },
  // full-bleed accent hugging the card's bottom edge (5px, rounded with the card)
  fbTrack: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 5,
    overflow: "hidden",
  },
  fbFillWrap: {
    height: "100%",
  },
  // ── avatar card ──
  avatarRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  affordance: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
});
