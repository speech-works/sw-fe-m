import { useFocusEffect, useNavigation } from "@react-navigation/native";
import React, { useCallback, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
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
  fonts,
} from "../../../../design-system";
import { useStaminaEstimate } from "./useStaminaEstimate";
import { UserAvatar } from "../../../../components/UserAvatar";

/**
 * Home's identity block — two sibling cards, one visual grammar:
 *
 *     [ ringed anchor ] LABEL          [ ringed avatar ]  ›
 *     Hero name                        Hero name
 *     status              pct          status              pct
 *
 * The LEVEL card rings its number; the AVATAR card rings the character with the
 * user's ENERGY. That merge is deliberate: energy used to be a full-width bar
 * above these cards, which shouted its most boring value (100%) all day. As a
 * ring it stays glanceable, costs no vertical space, and can ESCALATE — the
 * stroke turns amber at or below `LOW_ENERGY` — so it's quiet when you're fine
 * and loud when you're not. Prominence tracks urgency instead of being fixed.
 *
 * Both rings are the same shape but not the same weight: energy takes the
 * saturated `action.primary` (live, actionable), level the soft `text.accent`
 * (ambient progression). One hue family, separated by lightness — which is also
 * why nothing here competes with the solid-orange practice CTA below.
 *
 * This is the deliberate exception to the program's "horizontal bars, no rings"
 * rule (user directive). Raw XP numbers still live one tap away on Achievements.
 * Level + stamina data flow is ported verbatim from the legacy ResourceStats.
 */

const LEVEL_RING = { size: 34, stroke: 3 };
const ENERGY_RING = { size: 62, stroke: 3 };
/** Sized to leave ~5px inside the ring — the avatar's idle float is ±2px, so a
 *  tighter fit would let the character graze its own energy ring. */
const AVATAR_SIZE = 46;
/** At or below this %, the energy ring switches to the caution hue. */
const LOW_ENERGY = 25;

/**
 * Shared progress ring — used for both level and energy so the two cards can't
 * drift apart. Fills clockwise from 12 o'clock.
 *
 * Deliberately STATIC. An earlier revision drove `strokeDashoffset` through
 * Reanimated `useAnimatedProps` so the ring would count to its value; the
 * animated props never reached the SVG and both rings rendered stuck at 0%.
 * If the count-in is worth revisiting, verify it on a device BEFORE relying on
 * it — a ring that silently reads 0 is far worse than one that doesn't animate.
 */
const ProgressRing: React.FC<{
  pct: number;
  size: number;
  stroke: number;
  color: string;
  children?: React.ReactNode;
}> = ({ pct, size, stroke, color, children }) => {
  const { colors } = useTheme();
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const filled = Math.min(100, Math.max(0, pct));

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={colors.surface.control}
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - filled / 100)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.ringCenter} pointerEvents="none">
        {children}
      </View>
    </View>
  );
};

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
  const isLow = staminaPercentage <= LOW_ENERGY;
  const energyHue = isLow ? colors.accent.warning : colors.action.primary;

  const hasAvatar = !!user?.avatarManifest;
  const energyLabel = hasAvatar
    ? staminaPercentage === 100
      ? "Charged"
      : rechargeTimeLeft
        ? `~${rechargeTimeLeft} to full`
        : "Recharging…"
    : "Create yours";

  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {/* ── Level card ── */}
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
          }. ${levelPct}% to level ${userLevel + 1}. View achievements.`}
        >
          <View style={styles.cardInner}>
            {/* top anchor: the level number wrapped in its own progress ring */}
            <View style={styles.levelAnchor}>
              <ProgressRing
                pct={levelPct}
                size={LEVEL_RING.size}
                stroke={LEVEL_RING.stroke}
                color={colors.text.accent}
              >
                <Text
                  variant="body"
                  color="primary"
                  style={styles.ringNumText}
                  numberOfLines={1}
                >
                  {userLevel}
                </Text>
              </ProgressRing>
              <Text variant="label" color="accent" style={styles.anchorLabel}>
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
                <Text variant="caption" color="accent" style={styles.pct}>
                  {levelPct}%
                </Text>
              </View>
            </View>
          </View>
        </PressableScale>

        {/* ── Avatar card, which is ALSO the energy meter ──
            The character the user owns, ringed by their energy. Always shows a
            REAL avatar (null manifest renders the default), never an empty slot;
            the status line carries create-vs-energy state instead. */}
        <PressableScale
          onPress={() => navigation.navigate("AvatarStudio")}
          style={[
            styles.card,
            { backgroundColor: colors.surface.elevated, borderColor: colors.border.default },
            elevation.e2,
          ]}
          accessibilityRole="button"
          accessibilityLabel={`${
            hasAvatar ? "Your avatar" : "Create your avatar"
          }. Energy ${staminaPercentage} percent, ${energyLabel}. Opens the avatar studio.`}
        >
          <View style={styles.cardInner}>
            {/* top anchor: the character, ringed by energy, + an edit affordance */}
            <View style={styles.anchorRow}>
              <ProgressRing
                pct={staminaPercentage}
                size={ENERGY_RING.size}
                stroke={ENERGY_RING.stroke}
                color={energyHue}
              >
                <UserAvatar manifest={user?.avatarManifest} size={AVATAR_SIZE} animate />
              </ProgressRing>
              <View style={[styles.affordance, { backgroundColor: colors.surface.control }]}>
                <Icon name={icons.chevronRight} size={16} color={colors.text.secondary} />
              </View>
            </View>

            {/* nameplate + the energy readout */}
            <View style={styles.heroBlock}>
              <Text variant="h2" color="primary" numberOfLines={1} style={styles.heroName}>
                Avatar
              </Text>
              <View style={styles.baseline}>
                {/* Free users keep their upgrade path: the status line itself is
                    a tap target, so the card can still open the studio. */}
                {hasAvatar && !user?.isPaid ? (
                  <PressableScale
                    haptic={false}
                    onPress={() => navigation.navigate("PremiumModal")}
                    accessibilityRole="button"
                    accessibilityLabel="Upgrade energy"
                  >
                    <Text variant="caption" color={colors.text.link} numberOfLines={1}>
                      Upgrade
                    </Text>
                  </PressableScale>
                ) : (
                  <Text variant="caption" color="tertiary" numberOfLines={1}>
                    {energyLabel}
                  </Text>
                )}
                <View style={styles.energyReadout}>
                  <Icon name={icons.energy} size={11} color={energyHue} />
                  <Text variant="caption" style={[styles.pct, { color: energyHue }]}>
                    {staminaPercentage}%
                  </Text>
                </View>
              </View>
            </View>
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
  // Grid row holding the two identity cards — each takes half the width.
  grid: {
    flexDirection: "row",
    gap: spacing.lg,
  },
  card: {
    flex: 1,
    minHeight: 138,
    padding: spacing.lg,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  // The content column: anchor pinned up top, hero/nameplate at the bottom.
  cardInner: {
    flex: 1,
    justifyContent: "space-between",
  },
  // Avatar card: ringed character on the left, edit affordance pushed right.
  anchorRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  // Level card: ring and its label read as one object, so they stay adjacent.
  levelAnchor: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: spacing.sm,
  },
  anchorLabel: {
    letterSpacing: 0.6,
    flexShrink: 1,
  },
  // Whatever sits inside a ring (number, avatar) is centred on it.
  ringCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  ringNumText: {
    fontFamily: fonts.extrabold,
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
    alignItems: "center",
  },
  pct: {
    fontFamily: fonts.bold,
  },
  // bolt + % — one object, so it never wraps apart
  energyReadout: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  affordance: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
});
