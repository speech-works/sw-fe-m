import { StyleSheet, Text, View } from "react-native";
import React, { useState, useEffect, useCallback } from "react";
import Icon from "react-native-vector-icons/FontAwesome5";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../../util/functions/parseStyles";
import { theme } from "../../../../Theme/tokens";
import ProgressBar from "../../../../components/ProgressBar";
import { useUserStore } from "../../../../stores/user";
import { getMyUser } from "../../../../api/users";
import {
  getProgressToNextLevel,
  getUnlockedLevelsFromXP,
  LevelData,
  LevelProgress,
} from "../../../../util/functions/levels-xp";
import { LinearGradient } from "expo-linear-gradient";

const MAX_STAMINA = 80;
const STAMINA_RECHARGE_RATE_MINUTES = 18; // 1 stamina point every 18 minutes

interface ResourceStatsProps {
  refreshing: boolean;
}

const ResourceStats = ({ refreshing }: ResourceStatsProps) => {
  const { user, setUser } = useUserStore();
  const [remainingRechargeMinutes, setRemainingRechargeMinutes] = useState<
    number | null
  >(null);
  const [userLevel, setUserLevel] = useState<number>(0);
  const [userLevelData, setUserLevelData] = useState<LevelData | null>(null);
  const [userProgress, setUserProgress] = useState<LevelProgress | null>(null);

  const fetchAndSetUser = useCallback(() => {
    getMyUser()
      .then((user) => {
        setUser(user);
      })
      .catch((error) => {
        console.error("Error fetching current user:", error);
      });
  }, [setUser]);

  useEffect(() => {
    fetchAndSetUser();
  }, [fetchAndSetUser]);

  useEffect(() => {
    if (refreshing) {
      fetchAndSetUser();
    }
  }, [refreshing, fetchAndSetUser]);

  useEffect(() => {
    const calculateAndSetRechargeMinutes = () => {
      if (
        user?.currentStamina === undefined ||
        user.currentStamina >= MAX_STAMINA
      ) {
        setRemainingRechargeMinutes(0); // Fully recharged
        return;
      }

      const staminaNeeded = MAX_STAMINA - user.currentStamina;
      const totalRechargeMinutes =
        staminaNeeded * STAMINA_RECHARGE_RATE_MINUTES;
      setRemainingRechargeMinutes(totalRechargeMinutes);
    };

    calculateAndSetRechargeMinutes();

    const interval = setInterval(() => {
      setRemainingRechargeMinutes((prevMinutes) => {
        if (prevMinutes === null || prevMinutes <= 0) {
          clearInterval(interval);
          return 0;
        }
        return prevMinutes - 1;
      });
    }, 60 * 1000);

    return () => clearInterval(interval);
  }, [user?.currentStamina]);

  useEffect(() => {
    if (user && user.totalXp) {
      const levelData = getUnlockedLevelsFromXP(user.totalXp);
      const latestLevel = levelData[levelData.length - 1];
      setUserLevel(latestLevel.level);
      setUserLevelData(latestLevel.data);
    }
  }, [user?.totalXp]);

  useEffect(() => {
    if (user && user.totalXp) {
      const progress = getProgressToNextLevel(user.totalXp);
      setUserProgress(progress);
    }
  }, [user?.totalXp]);

  // Format the remaining minutes into "Hh Mm" string for display
  const formatRechargeTime = (minutes: number | null) => {
    if (minutes === null) {
      return "Calculating...";
    }
    if (minutes <= 0) {
      return "Full";
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    } else {
      return `${remainingMinutes}m`;
    }
  };

  const staminaPercentage = user?.currentStamina
    ? Math.floor((user.currentStamina / MAX_STAMINA) * 100)
    : 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Overview</Text>
      </View>

      <View style={styles.cardsRow}>
        {/* Free Tasks Card - Sage Green */}
        <LinearGradient
          colors={["#578E7E", "#3D6E66"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.card, styles.cardShadowSage]}
        >
          <View style={styles.bubbleTopRight} />
          <View style={styles.watermarkContainer}>
            <Icon
              name="check-circle"
              size={70}
              color="white"
              style={{ opacity: 0.1 }}
            />
          </View>

          <View style={styles.cardHeader}>
            <Text style={styles.cardTitleWhite}>Free Tasks</Text>
            <View style={styles.iconChip}>
              <Icon name="check" size={10} color="#3D6E66" />
            </View>
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.valueTextWhite}>
              {user?.freeTasksRemaining || 0}
            </Text>
            <View style={styles.glassLabel}>
              <Text style={styles.subTextWhite}>Resets Daily</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Stamina Card - Terra Cotta */}
        <LinearGradient
          colors={["#C07F58", "#A05F3F"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.card, styles.cardShadowTerra]}
        >
          <View style={styles.bubbleBottomLeft} />
          <View style={styles.watermarkContainer}>
            <Icon
              name="bolt"
              size={70}
              color="white"
              style={{ opacity: 0.1 }}
            />
          </View>

          <View style={styles.cardHeader}>
            <Text style={styles.cardTitleWhite}>Stamina</Text>
            <View style={styles.iconChip}>
              <Icon solid name="bolt" size={10} color="#A05F3F" />
            </View>
          </View>
          <View style={styles.cardContent}>
            <View style={styles.staminaRow}>
              <Text style={styles.valueTextWhite}>{staminaPercentage}%</Text>
            </View>
            {remainingRechargeMinutes !== null &&
              remainingRechargeMinutes > 0 && (
                <View
                  style={[
                    styles.glassLabel,
                    { marginTop: 4, alignSelf: "flex-start" },
                  ]}
                >
                  <Text style={styles.rechargeTextWhite}>
                    {formatRechargeTime(remainingRechargeMinutes)}
                  </Text>
                </View>
              )}

            <View style={{ width: "100%", marginTop: 8 }}>
              {/* White Progress Bar on Gradient */}
              <View
                style={{
                  height: 6,
                  backgroundColor: "rgba(255,255,255,0.3)",
                  borderRadius: 3,
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    height: "100%",
                    width: `${
                      ((user?.currentStamina || 0) / MAX_STAMINA) * 100
                    }%`,
                    backgroundColor: "white",
                    borderRadius: 3,
                  }}
                />
              </View>
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* XP / Level Card - Slate Blue */}
      <LinearGradient
        colors={["#64748B", "#475569"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.card,
          styles.cardXP,
          styles.cardShadowSlate,
          {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          },
        ]}
      >
        <View style={styles.bubbleTopRightLarge} />
        <View style={styles.watermarkContainer}>
          <Icon
            name="star"
            size={90}
            color="white"
            style={{ opacity: 0.08, transform: [{ rotate: "15deg" }] }}
          />
        </View>

        <View style={{ flex: 1, gap: 4 }}>
          <Text style={styles.cardTitleWhite}>Current Level</Text>
          <View style={styles.levelRow}>
            <View style={{ opacity: 0.8 }}>
              {userLevelData?.icon(24) || null}
            </View>
            <Text style={styles.levelTextWhite}>
              {userLevelData?.levelTitle || `Level ${userLevel}`}
            </Text>
          </View>
          {userProgress && (
            <View style={{ marginTop: 6, gap: 6 }}>
              {/* White Progress Bar on Gradient */}
              <View
                style={{
                  height: 6,
                  backgroundColor: "rgba(255,255,255,0.3)",
                  borderRadius: 3,
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    height: "100%",
                    width: `${userProgress.progressPercent}%`,
                    backgroundColor: "white",
                    borderRadius: 3,
                  }}
                />
              </View>
              <Text style={styles.xpTextWhite}>
                {userProgress.xpIntoLevel} / {userProgress.xpForNextLevel} XP
              </Text>
            </View>
          )}
        </View>
        <View
          style={{
            alignItems: "flex-end",
            justifyContent: "center",
            paddingLeft: 12,
          }}
        >
          <Text style={styles.totalXpLabelWhite}>Total XP</Text>
          <Text style={styles.totalXpValueWhite}>{user?.totalXp || 0}</Text>
        </View>
      </LinearGradient>
    </View>
  );
};

export default ResourceStats;

const styles = StyleSheet.create({
  container: {
    gap: 16,
    marginVertical: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  headerTitle: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
  },
  cardsRow: {
    flexDirection: "row",
    gap: 12,
  },
  card: {
    flex: 1,
    borderRadius: 20,
    padding: 16,
    gap: 10,
    overflow: "hidden",
    position: "relative",
    minHeight: 140,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  // Muted Earth Shadows
  cardShadowSage: {
    shadowColor: "#3D6E66",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  cardShadowTerra: {
    shadowColor: "#A05F3F",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  cardShadowSlate: {
    shadowColor: "#475569",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  cardXP: {
    minHeight: 100,
  },

  // Decorations (White overlays)
  bubbleTopRight: {
    position: "absolute",
    top: -20,
    right: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  bubbleTopRightLarge: {
    position: "absolute",
    top: -40,
    right: -20,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  bubbleBottomLeft: {
    position: "absolute",
    bottom: -20,
    left: -20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  watermarkContainer: {
    position: "absolute",
    bottom: -15,
    right: -15,
    zIndex: 0,
  },
  iconChip: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
  },
  glassLabel: {
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
  },

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 1,
  },
  cardTitleWhite: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: "rgba(255,255,255,0.9)",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontSize: 10,
  },
  cardContent: {
    gap: 4,
    zIndex: 1,
    flex: 1,
    justifyContent: "flex-end",
  },
  valueTextWhite: {
    ...parseTextStyle(theme.typography.Heading2),
    fontSize: 32,
    lineHeight: 38,
    color: "white",
    fontWeight: "800", // Heavy bold
  },
  subTextWhite: {
    ...parseTextStyle(theme.typography.BodyDetails),
    color: "white",
    fontSize: 11,
    fontWeight: "600",
  },
  staminaRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    flexWrap: "wrap",
  },
  rechargeTextWhite: {
    ...parseTextStyle(theme.typography.BodyDetails),
    color: "white",
    fontSize: 11,
    fontWeight: "600",
  },
  levelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    zIndex: 1,
  },
  levelTextWhite: {
    ...parseTextStyle(theme.typography.Heading3), // Corrected token
    fontWeight: "800",
    color: "white",
    fontSize: 16,
  },
  xpTextWhite: {
    ...parseTextStyle(theme.typography.BodyDetails),
    color: "rgba(255,255,255,0.9)",
    fontSize: 11,
    fontWeight: "600",
  },
  totalXpLabelWhite: {
    ...parseTextStyle(theme.typography.BodyDetails),
    color: "rgba(255,255,255,0.8)",
    fontSize: 10,
    textTransform: "uppercase",
  },
  totalXpValueWhite: {
    ...parseTextStyle(theme.typography.Heading3),
    color: "white",
    fontSize: 20,
    fontWeight: "800",
  },
});
