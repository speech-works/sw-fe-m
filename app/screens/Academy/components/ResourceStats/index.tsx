import { useIsFocused, useNavigation, useFocusEffect } from "@react-navigation/native";
import React, { useEffect, useRef, useCallback } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { getLevelStage, LevelStage } from "../../../../api/users";
import { useUserStore } from "../../../../stores/user";
import {
  useTheme,
  spacing,
  radius,
  Text,
  Icon,
  icons,
} from "../../../../design-system";

// Animated Bar Component
const AnimatedBar = ({
  percentage,
  color,
  trackColor,
}: {
  percentage: number;
  color: string;
  trackColor: string;
}) => {
  const widthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: percentage,
      duration: 1000,
      useNativeDriver: false,
      easing: Easing.out(Easing.exp),
    }).start();
  }, [percentage]);

  return (
    <View style={[styles.barTrack, { backgroundColor: trackColor }]}>
      <Animated.View
        style={[
          styles.barFill,
          {
            backgroundColor: color,
            width: widthAnim.interpolate({
              inputRange: [0, 100],
              outputRange: ["0%", "100%"],
            }),
          },
        ]}
      />
    </View>
  );
};

const ResourceStats = ({
  refreshing,
  style,
}: {
  refreshing?: boolean;
  style?: any;
}) => {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const { user, fetchUser } = useUserStore();
  const isFocused = useIsFocused();
  const navigation = useNavigation<any>();
  const [rechargeTimeLeft, setRechargeTimeLeft] = React.useState<string>("");
  const [estimatedStamina, setEstimatedStamina] = React.useState<number>(
    user?.currentStamina ?? 0,
  );

  // Force-refresh user data every time the screen gains focus.
  // This ensures stamina, XP, and level are always fresh after activities.
  useFocusEffect(
    useCallback(() => {
      fetchUser();
    }, [fetchUser])
  );

  const [levelStage, setLevelStage] = React.useState<LevelStage | null>(null);
  const [isLoadingLevel, setIsLoadingLevel] = React.useState(true);

  useEffect(() => {
    if (user) {
      setIsLoadingLevel(true);
      getLevelStage()
        .then(setLevelStage)
        .catch((e) => {
          console.error(e);
          // Optional fallback logic here if needed
        })
        .finally(() => setIsLoadingLevel(false));
    } else {
      setIsLoadingLevel(false);
    }
  }, [user?.id, user?.level]);

  const userLevel = levelStage?.level || user?.level || 1;
  const xpIntoLevel = Math.max(
    0,
    (levelStage?.totalXp ?? user?.totalXp ?? 0) -
      (levelStage?.currentLevelXpFloor || 0),
  );
  const xpForNextLevel = Math.max(
    1,
    (levelStage?.nextLevelXpCeiling || 100) -
      (levelStage?.currentLevelXpFloor || 0),
  );
  const xpRemaining = xpForNextLevel - xpIntoLevel;

  const pulseAnim = useRef(new Animated.Value(1)).current;

  const currentMaxStamina = user?.maxStaminaCap || 80;
  const staminaPercentage = Math.min(
    100,
    Math.round((estimatedStamina / currentMaxStamina) * 100),
  );

  useEffect(() => {
    if (!isFocused) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim, isFocused]);

  useEffect(() => {
    if (user?.currentStamina !== undefined) {
      setEstimatedStamina(user.currentStamina);
    }
  }, [user?.currentStamina]);

  useEffect(() => {
    if (
      !isFocused ||
      !user ||
      !user.isPaid ||
      (user.currentStamina ?? 0) >= currentMaxStamina ||
      !user.lastStaminaUpdate
    ) {
      setRechargeTimeLeft((prev) => (prev !== "" ? "" : prev));
      if (user?.currentStamina !== undefined) {
        setEstimatedStamina((prev) => (prev !== user.currentStamina ? user.currentStamina! : prev));
      }
      return;
    }

    const updateTimerAndEstimation = () => {
      const now = new Date().getTime();
      const lastUpdate = new Date(user.lastStaminaUpdate!).getTime();
      const RECHARGE_MS = user.staminaRegenRateMs || 18 * 60 * 1000;

      // Calculate how many points were recharged since lastUpdate
      const msPassed = now - lastUpdate;
      const pointsRecharged = Math.floor(msPassed / RECHARGE_MS);
      const newEstimation = Math.min(
        currentMaxStamina,
        (user.currentStamina ?? 0) + pointsRecharged,
      );

      setEstimatedStamina((prev) => (prev !== newEstimation ? newEstimation : prev));

      if (newEstimation >= currentMaxStamina) {
        setRechargeTimeLeft((prev) => (prev !== "" ? "" : prev));
        return;
      }

      // Time for VERY NEXT point
      const msUntilNextPoint = RECHARGE_MS - (msPassed % RECHARGE_MS);

      // Time until FULL
      const pointsToFull = currentMaxStamina - newEstimation;
      const totalMsUntilFull =
        (pointsToFull - 1) * RECHARGE_MS + msUntilNextPoint;

      const totalSeconds = Math.floor(totalMsUntilFull / 1000);
      const h = Math.floor(totalSeconds / 3600);
      const m = Math.floor((totalSeconds % 3600) / 60);
      const s = totalSeconds % 60;

      const newTime = h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`;
      setRechargeTimeLeft((prev) => (prev !== newTime ? newTime : prev));
    };

    updateTimerAndEstimation(); // Initial call
    const interval = setInterval(updateTimerAndEstimation, 1000); // Live update
    return () => clearInterval(interval);
  }, [user?.currentStamina, user?.lastStaminaUpdate, user?.isPaid, isFocused]);

  const gridOriginY = React.useRef(0);

  // Derived Values for Bars
  const tasksRemaining = Math.min(user?.freeTasksRemaining || 0, 5);
  const tasksTotal = 5;
  const taskPercentage = (tasksRemaining / tasksTotal) * 100;

  return (
    <View style={[styles.container, style]}>
      {/* Dark identity card — orange/accent stats, not an orange flood. */}
      <View style={[styles.card, { backgroundColor: colors.surface.default }]}>
        {/* Large watermark — flame at low opacity on the dark surface. */}
        <View style={styles.mainWatermarkContainer} pointerEvents="none">
          <Icon name={icons.streak} size={120} color={colors.action.primary} style={{ opacity: 0.08 }} />
        </View>

        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <View style={[styles.chip, { backgroundColor: colors.action.primaryTint }]}>
              <Icon name={icons.chartPie} size={12} color={colors.action.primary} />
              <Text variant="label" color={colors.action.primary}>
                OVERVIEW
              </Text>
            </View>
            <Text variant="h2" color="primary" style={styles.cardTitle}>
              Daily Progress
            </Text>
            <Text variant="bodySm" color="secondary">
              Your energy and growth
            </Text>
          </View>
        </View>

        {/* Data stack */}
        <View style={styles.dataStack}>
          {/* 1. Energy Section (Full Width) */}
          <View style={styles.energySection}>
            <View style={styles.energyHeader}>
              <View style={styles.energyHeaderLeft}>
                <View style={[styles.iconCircle, { backgroundColor: colors.action.primaryTint }]}>
                  <Icon name={icons.energy} size={16} color={colors.action.primary} />
                </View>
                <Text variant="label" color="secondary">
                  ENERGY TANK
                </Text>
              </View>
              <Text variant="h2" color={colors.action.primary}>
                {staminaPercentage}%
              </Text>
            </View>

            <AnimatedBar
              percentage={staminaPercentage}
              color={colors.action.primary}
              trackColor={colors.surface.control}
            />

            <View style={styles.energyFooter}>
              {!user?.isPaid ? (
                <TouchableOpacity
                  onPress={() => navigation.navigate("PremiumModal")}
                >
                  <Text variant="caption" color={colors.text.link}>
                    Upgrade Energy
                  </Text>
                </TouchableOpacity>
              ) : staminaPercentage === 100 ? (
                <Text variant="caption" color="tertiary">
                  Fully Charged
                </Text>
              ) : (
                <Text variant="caption" color="tertiary">
                  {rechargeTimeLeft
                    ? `~${rechargeTimeLeft} until full`
                    : "Recharging..."}
                </Text>
              )}
            </View>
          </View>

          <View
            style={[
              styles.gridContainer,
              width < 320 && { flexDirection: "column" },
            ]}
            onLayout={(e) => {
              gridOriginY.current = e.nativeEvent.layout.y;
            }}
          >
            <View
              style={[
                styles.tileWrapper,
                width < 320 && { flex: 0, width: "100%" },
              ]}
            >
              {/* Task Card */}
              <View style={[styles.bigCard, { backgroundColor: colors.surface.control }]}>
                {/* Watermark Icon */}
                <View
                  style={[
                    styles.watermarkContainer,
                    { transform: [{ rotate: "-20deg" }] },
                  ]}
                  pointerEvents="none"
                >
                  <Icon name={icons.success} size={90} color={colors.accent.success} style={{ opacity: 0.08 }} />
                </View>

                <View style={styles.cardHeader}>
                  <Text variant="label" color="tertiary">
                    FREE ACTIVITY
                  </Text>
                </View>
                <View style={styles.cardBody}>
                  <Text variant="display" color="primary">
                    {tasksRemaining}
                  </Text>
                  <Text variant="title" color="tertiary">
                    / {tasksTotal}
                  </Text>
                </View>
                {/* Mini Bar */}
                <View style={[styles.miniTrack, { backgroundColor: colors.accentTint.success }]}>
                  <View
                    style={{
                      height: "100%",
                      backgroundColor: colors.accent.success,
                      borderRadius: radius.xs,
                      width: `${taskPercentage}%`,
                    }}
                  />
                </View>
              </View>
            </View>

            <View
              style={[
                styles.tileWrapper,
                width < 320 && { flex: 0, width: "100%" },
              ]}
            >
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate("ProgressDetail", {
                    scrollTo: "achievements",
                  })
                }
                style={[styles.bigCard, { backgroundColor: colors.surface.control }]}
              >
                {/* Watermark Icon */}
                <View
                  style={[
                    styles.watermarkContainer,
                    { transform: [{ rotate: "-20deg" }] },
                  ]}
                  pointerEvents="none"
                >
                  <Icon name={icons.proud} size={90} color={colors.accent.info} style={{ opacity: 0.08 }} />
                </View>

                <View style={styles.cardHeader}>
                  <Text variant="label" color="tertiary">
                    LEVEL
                  </Text>
                </View>
                <View style={styles.cardBody}>
                  <Text variant="display" color="primary">
                    {isLoadingLevel ? "..." : userLevel}
                  </Text>
                </View>
                {/* XP Text + Progress Bar */}
                <View style={{ marginTop: spacing.sm }}>
                  <View style={styles.xpRow}>
                    {!isLoadingLevel && levelStage && (
                      <Animated.View
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: radius.xs,
                          backgroundColor: colors.action.primary,
                          transform: [{ scale: pulseAnim }],
                        }}
                      />
                    )}
                    <Text variant="caption" color={colors.action.primary}>
                      {isLoadingLevel
                        ? "Calculating XP..."
                        : levelStage
                          ? `${xpIntoLevel} / ${xpForNextLevel} XP`
                          : "Syncing..."}
                    </Text>
                  </View>

                  {/* Mini Bar for XP */}
                  {!isLoadingLevel && levelStage && (
                    <View style={[styles.miniTrack, { backgroundColor: colors.action.primaryTint }]}>
                      <View
                        style={{
                          height: "100%",
                          backgroundColor: colors.action.primary,
                          borderRadius: radius.xs,
                          width: `${Math.min(100, Math.round((xpIntoLevel / xpForNextLevel) * 100))}%`,
                        }}
                      />
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

export default ResourceStats;

const styles = StyleSheet.create({
  container: {
    marginVertical: 0,
  },
  card: {
    borderRadius: radius.card,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing["3xl"],
    paddingBottom: spacing["2xl"],
    position: "relative",
    overflow: "hidden",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing["2xl"],
    zIndex: 1,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.chip,
    alignSelf: "flex-start",
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  cardTitle: {
    marginBottom: spacing.xs,
  },
  mainWatermarkContainer: {
    position: "absolute",
    top: -20,
    right: -40,
    zIndex: 0,
    transform: [{ rotate: "-15deg" }, { scaleX: -1 }],
  },

  // Data stack
  dataStack: {
    gap: spacing.lg,
    zIndex: 1,
  },

  // Energy Section
  energySection: {
    width: "100%",
    gap: spacing.sm,
  },
  energyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xxs,
  },
  energyHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  energyFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },

  // Grid Section
  gridContainer: {
    flexDirection: "row",
    gap: spacing.lg,
  },
  tileWrapper: {
    flex: 1,
  },
  bigCard: {
    flex: 1,
    padding: spacing.lg,
    borderRadius: radius.md,
    justifyContent: "space-between",
    width: "100%",
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  cardBody: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: spacing.xs,
  },
  xpRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  miniTrack: {
    marginTop: spacing.sm,
    height: 6,
    borderRadius: radius.xs,
    width: "100%",
    overflow: "hidden",
  },

  // Animations
  barTrack: {
    height: 12,
    borderRadius: radius.sm,
    width: "100%",
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: radius.sm,
  },
  watermarkContainer: {
    position: "absolute",
    bottom: -15,
    right: -15,
    zIndex: -1,
  },
});
