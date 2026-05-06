import { useIsFocused, useNavigation, useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef, useCallback } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import Icon from "react-native-vector-icons/FontAwesome5";
import { getLevelStage, LevelStage } from "../../../../api/users";
import { useUserStore } from "../../../../stores/user";
import { theme } from "../../../../Theme/tokens";
import { parseTextStyle } from "../../../../util/functions/parseStyles";
import { ROUTE_NAMES } from "../../../../constants/routes";

// Animated Bar Component
const AnimatedBar = ({
  percentage,
  color,
}: {
  percentage: number;
  color: string;
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
    <View style={styles.barTrack}>
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

  // SVG Config
  const size = 88; // Slightly larger
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const gridOriginY = React.useRef(0);

  // Derived Values for Bars
  const tasksRemaining = Math.min(user?.freeTasksRemaining || 0, 5);
  const tasksTotal = 5;
  const taskPercentage = (tasksRemaining / tasksTotal) * 100;

  return (
    <View style={[styles.container, style]}>
      {/* The Aurora Card */}
      <View style={styles.cardContainer}>
        <LinearGradient
          colors={[
            theme.colors.library.red[300],
            theme.colors.library.orange[400],
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          <View style={styles.bubbleTopRight} />
          <View style={styles.bubbleBottomLeft} />

          {/* Header */}
          <View style={styles.headerRow}>
            <View>
              <View style={styles.chip}>
                <Icon name="chart-pie" size={12} color="white" />
                <Text style={styles.chipText}>Overview</Text>
              </View>
              <Text style={styles.cardTitle}>Daily Progress</Text>
              <Text style={styles.cardSubtitle}>Your energy and growth</Text>
            </View>
          </View>

          {/* Large Watermark Icon */}
          <View style={styles.mainWatermarkContainer}>
            <Icon
              name="fire"
              size={120}
              color="white"
              style={{ opacity: 0.2 }}
            />
          </View>

          {/* Glass Data Card - MAXIMALIST STACK */}
          <View style={styles.glassCard}>
            {/* 1. Energy Section (Full Width) */}
            <View style={{ paddingVertical: 12, marginVertical: -12 }}>
              <View style={styles.energySection}>
                <View style={styles.energyHeader}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <View
                      style={[
                        styles.iconCircle,
                        { backgroundColor: "#FFF7ED" },
                      ]}
                    >
                      <Icon name="bolt" size={16} color="#F97316" solid />
                    </View>
                    <Text style={styles.sectionLabel}>Energy Tank</Text>
                  </View>
                  <Text style={styles.energyValue}>{staminaPercentage}%</Text>
                </View>

                <AnimatedBar percentage={staminaPercentage} color="#F97316" />

                <View style={styles.energyFooter}>
                  {!user?.isPaid ? (
                    <TouchableOpacity
                      onPress={() => navigation.navigate("PremiumModal")}
                    >
                      <Text style={[styles.footerText, { color: "#3B82F6" }]}>
                        Upgrade Energy
                      </Text>
                    </TouchableOpacity>
                  ) : staminaPercentage === 100 ? (
                    <Text style={styles.footerText}>Fully Charged</Text>
                  ) : (
                    <Text style={styles.footerText}>
                      {rechargeTimeLeft
                        ? `~${rechargeTimeLeft} until full`
                        : "Recharging..."}
                    </Text>
                  )}
                </View>
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
                {/* Task Card - HUGE */}
                <View
                  style={[
                    styles.bigCard,
                    { backgroundColor: "#F1F5F9", borderWidth: 0 },
                  ]}
                >
                  {/* Watermark Icon */}
                  <View
                    style={[
                      styles.watermarkContainer,
                      { transform: [{ rotate: "-20deg" }] },
                    ]}
                  >
                    <Icon
                      name="check-circle"
                      size={90}
                      color="#10B981"
                      style={{ opacity: 0.05 }}
                    />
                  </View>

                  <View style={styles.cardHeader}>
                    <Text style={[styles.cardLabel, { color: "#64748B" }]}>
                      Free Activity
                    </Text>
                  </View>
                  <View style={styles.cardBody}>
                    <Text style={[styles.bigValue, { color: "#1E293B" }]}>
                      {tasksRemaining}
                    </Text>
                    <Text style={[styles.unitLabel, { color: "#94A3B8" }]}>
                      / {tasksTotal}
                    </Text>
                  </View>
                  {/* Mini Bar */}
                  <View
                    style={{
                      marginTop: 8,
                      height: 6,
                      backgroundColor: "rgba(16, 185, 129, 0.1)",
                      borderRadius: 3,
                      width: "100%",
                    }}
                  >
                    <View
                      style={{
                        height: "100%",
                        backgroundColor: "#10B981",
                        borderRadius: 3,
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
                  style={[
                    styles.bigCard,
                    { backgroundColor: "#F1F5F9", borderWidth: 0 },
                  ]}
                >
                  {/* Watermark Icon */}
                  <View
                    style={[
                      styles.watermarkContainer,
                      { transform: [{ rotate: "-20deg" }] },
                    ]}
                  >
                    <Icon
                      name="star"
                      size={90}
                      color="#3B82F6"
                      style={{ opacity: 0.05 }}
                    />
                  </View>

                  <View style={styles.cardHeader}>
                    <Text style={[styles.cardLabel, { color: "#64748B" }]}>
                      Level
                    </Text>
                  </View>
                  <View style={styles.cardBody}>
                    <Text style={[styles.bigValue, { color: "#1E293B" }]}>
                      {isLoadingLevel ? "..." : userLevel}
                    </Text>
                  </View>
                  {/* XP Text + Progress Bar */}
                  <View style={{ marginTop: 8 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                        marginBottom: 6,
                      }}
                    >
                      {!isLoadingLevel && levelStage && (
                        <Animated.View
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: 3,
                            backgroundColor: theme.colors.library.orange[500],
                            transform: [{ scale: pulseAnim }],
                          }}
                        />
                      )}
                      <Text
                        style={[
                          styles.xpText,
                          { color: theme.colors.library.orange[600] },
                        ]}
                      >
                        {isLoadingLevel
                          ? "Calculating XP..."
                          : levelStage
                            ? `${xpIntoLevel} / ${xpForNextLevel} XP`
                            : "Syncing..."}
                      </Text>
                    </View>

                    {/* Mini Bar for XP */}
                    {!isLoadingLevel && levelStage && (
                      <View
                        style={{
                          height: 6,
                          backgroundColor: "rgba(249, 115, 22, 0.1)",
                          borderRadius: 3,
                          width: "100%",
                        }}
                      >
                        <View
                          style={{
                            height: "100%",
                            backgroundColor: "#F97316",
                            borderRadius: 3,
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
        </LinearGradient>
      </View>
    </View>
  );
};

export default ResourceStats;

const styles = StyleSheet.create({
  container: {
    marginVertical: 0,
  },
  cardContainer: {
    marginVertical: 0,
    borderRadius: 24,
    // Premium SaaS Shadow
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 10,
    overflow: "hidden",
  },
  gradient: {
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 24, // Reduced bottom padding
    position: "relative",
  },
  bubbleTopRight: {
    position: "absolute",
    top: -80,
    right: -80,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  bubbleBottomLeft: {
    position: "absolute",
    bottom: -60,
    left: -60,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
    zIndex: 1,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: "flex-start",
    marginBottom: 12,
    gap: 6,
  },
  chipText: {
    color: "white",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "white",
    marginBottom: 4,
    letterSpacing: -0.6,
  },
  cardSubtitle: {
    fontSize: 15,
    color: "rgba(255, 255, 255, 0.85)",
    fontWeight: "500",
    lineHeight: 20,
  },
  mainWatermarkContainer: {
    position: "absolute",
    top: -20,
    right: -60,
    zIndex: 0,
    transform: [{ rotate: "-15deg" }, { scaleX: -1 }],
  },

  // Glass Card - Stack Layout
  glassCard: {
    flexDirection: "column",
    backgroundColor: "rgba(255, 255, 255, 0.96)",
    padding: 20,
    borderRadius: 16,
    zIndex: 1,
    gap: 16,
    // Internal Shadow
    shadowColor: "#431407",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 4,
  },

  // Energy Section
  energySection: {
    width: "100%",
    gap: 10,
  },
  energyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  energyValue: {
    fontSize: 28,
    fontWeight: "900",
    color: "#EA580C",
    letterSpacing: -0.5,
  },
  energyFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  footerText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#94A3B8",
  },
  xpText: {
    fontSize: 12,
    fontWeight: "700", // Bolder for clarity
  },

  // Grid Section
  gridContainer: {
    flexDirection: "row",
    gap: 16,
  },
  tileWrapper: {
    flex: 1,
  },
  bigCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 0,
    justifyContent: "space-between",
    width: "100%",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  cardBody: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  bigValue: {
    fontSize: 32,
    fontWeight: "900",
    lineHeight: 36,
    letterSpacing: -1,
  },
  unitLabel: {
    fontSize: 16,
    fontWeight: "600",
  },

  // Animations
  barTrack: {
    height: 12, // Thick
    backgroundColor: "rgba(0,0,0,0.05)",
    borderRadius: 6,
    width: "100%",
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 6,
  },
  watermarkContainer: {
    position: "absolute",
    bottom: -15,
    right: -15,
    zIndex: -1,
  },
});
