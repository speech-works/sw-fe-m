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
import { UserAvatar } from "../../../../components/UserAvatar";

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

      {/* 2. Level card + avatar card (below energy) — the two-card identity row. */}
      <View style={styles.grid}>
        <PressableScale
          onPress={() =>
            navigation.navigate("ProgressDetail", { scrollTo: "achievements" })
          }
          style={[styles.card, { backgroundColor: colors.surface.elevated, borderColor: colors.border.default, borderWidth: 1 }]}
          accessibilityRole="button"
          accessibilityLabel={`Level ${userLevel}${
            levelStage?.title ? `, ${levelStage.title}` : ""
          }. View achievements.`}
        >
          <View style={styles.cardHeader}>
            <View style={[styles.levelBadge, { backgroundColor: colors.action.primary }]}>
              <Text variant="h3" color={colors.action.onPrimary} numberOfLines={1}>
                {userLevel}
              </Text>
            </View>
            <Icon name={icons.chevronRight} size={18} color={colors.text.tertiary} />
          </View>
          
          <View style={styles.cardContent}>
            <Text
              variant="body"
              color="primary"
              numberOfLines={1}
              style={{ fontFamily: "Inter-SemiBold" }}
            >
              {isLoadingLevel && !levelStage
                ? "Syncing…"
                : levelStage?.title ?? `Level ${userLevel}`}
            </Text>
            <ProgressBar
              value={levelStage ? xpIntoLevel : 0}
              max={xpForNextLevel}
              height={6}
            />
          </View>
        </PressableScale>

        {/* Avatar card — the character the user owns. Always shows a REAL
            avatar (null manifest renders the default), never an empty slot;
            the caption carries the create-vs-edit state instead. */}
        <PressableScale
          onPress={() => navigation.navigate("AvatarStudio")}
          style={[styles.card, { backgroundColor: colors.surface.elevated, borderColor: colors.border.default, borderWidth: 1 }]}
          accessibilityRole="button"
          accessibilityLabel={
            user?.avatarManifest
              ? "Your avatar. Open the avatar studio."
              : "Create your avatar."
          }
        >
          <View style={styles.cardHeader}>
            <UserAvatar manifest={user?.avatarManifest} size={32} />
            <Icon name={icons.chevronRight} size={18} color={colors.text.tertiary} />
          </View>
          
          <View style={styles.cardContent}>
            <Text
              variant="body"
              color="primary"
              numberOfLines={1}
              style={{ fontFamily: "Inter-SemiBold" }}
            >
              Avatar
            </Text>
            <Text variant="caption" color="secondary" numberOfLines={1}>
              {user?.avatarManifest ? "View profile" : "Create yours"}
            </Text>
          </View>
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
    padding: spacing.xl,
    borderRadius: radius.card,
    gap: spacing.lg,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  cardContent: {
    gap: spacing.xs,
  },
  levelBadge: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
});
