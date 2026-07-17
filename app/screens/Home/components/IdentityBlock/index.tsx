import { useFocusEffect, useNavigation } from "@react-navigation/native";
import React, { useCallback, useEffect, useState } from "react";
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
  ProgressBar,
} from "../../../../design-system";
import { useStaminaEstimate } from "./useStaminaEstimate";

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

  const { staminaPercentage, rechargeTimeLeft } = useStaminaEstimate(user ?? null);

  return (
    <View style={styles.container}>
      {/* 1. Energy — the big meter, floating on top. */}
      <View style={styles.energy}>
        <View style={styles.rowHeader}>
          <View style={styles.energyHeaderLeft}>
            <View
              style={[styles.iconCircle, { backgroundColor: colors.action.primaryTint }]}
            >
              <Icon name={icons.energy} size={16} color={colors.text.accent} />
            </View>
            <Text variant="title" color="primary">
              Energy
            </Text>
          </View>
          <Text variant="h2" color="accent">
            {staminaPercentage}%
          </Text>
        </View>
        {/* Fed the SAME rounded value as the % label, so the fill and the
            number can never disagree (e.g. 79/80 → "99%" over a 98.75% bar). */}
        <ProgressBar
          value={staminaPercentage}
          max={100}
          color={colors.action.primary}
          height={24}
        />
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

      {/* 2. Level card (below energy) — taps through to the Achievements detail.
          The grid row leaves room for a sibling card beside it. */}
      <View style={styles.grid}>
        <PressableScale
          onPress={() =>
            navigation.navigate("ProgressDetail", { scrollTo: "achievements" })
          }
          style={[styles.card, { backgroundColor: colors.surface.default }, elevation.e2]}
          accessibilityRole="button"
          accessibilityLabel={`Level ${userLevel}${
            levelStage?.title ? `, ${levelStage.title}` : ""
          }. View achievements.`}
        >
          <View style={styles.cardHeader}>
            <View style={styles.identityLeft}>
              {/* The app's level language: an orange numbered badge (mirrors
                  <Avatar level> in Settings). Becomes the real avatar later. */}
              <View style={[styles.levelBadge, { backgroundColor: colors.action.primary }]}>
                <Text variant="title" color={colors.action.onPrimary} numberOfLines={1}>
                  {userLevel}
                </Text>
              </View>
              <Text
                variant="h3"
                color="primary"
                numberOfLines={1}
                style={styles.levelTitle}
              >
                {isLoadingLevel && !levelStage
                  ? "Syncing…"
                  : levelStage?.title ?? `Level ${userLevel}`}
              </Text>
            </View>
            <Icon name={icons.chevronRight} size={18} color={colors.text.tertiary} />
          </View>
          {/* Gated on levelStage: until it resolves, xpForNextLevel falls back
              to 100 while xpIntoLevel is the FULL totalXp, so the bar would
              paint 100% and then snap backwards — while the title still reads
              "Syncing…". Show an empty track instead. */}
          <ProgressBar
            value={levelStage ? xpIntoLevel : 0}
            max={xpForNextLevel}
            height={8}
          />
        </PressableScale>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.xl,
  },
  energy: {
    gap: spacing.sm,
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
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  // Grid row that holds the level card — flex children so a sibling card can
  // slot in beside it (each becomes half-width) without any restyle.
  grid: {
    flexDirection: "row",
    gap: spacing.lg,
  },
  card: {
    flex: 1,
    padding: spacing.lg,
    borderRadius: radius.card,
    gap: spacing.md,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  identityLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flex: 1,
  },
  levelTitle: {
    flex: 1,
  },
  levelBadge: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
});
