import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Dimensions,
  Animated,
  Easing,
} from "react-native";
import React, { useEffect, useRef } from "react";
import { theme } from "../../../../Theme/tokens";
import { parseTextStyle } from "../../../../util/functions/parseStyles";
import Icon from "react-native-vector-icons/FontAwesome5";
import { LinearGradient } from "expo-linear-gradient";
import { useUserStore } from "../../../../stores/user";
import {
  getMyUser,
  getUnlockedLevelsFromXP,
  getProgressToNextLevel,
  MAX_STAMINA,
} from "../../../../api/users";
import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgGradient,
  Stop,
  G,
} from "react-native-svg";

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

const ResourceStats = ({ refreshing }: { refreshing: boolean }) => {
  const { user } = useUserStore();
  const [rechargeTimeLeft, setRechargeTimeLeft] = React.useState<string>("");

  const userProgress = user
    ? getProgressToNextLevel(user.totalXp ?? 0)
    : undefined;
  const userLevel = userProgress?.currentLevel || 1;

  const staminaPercentage = user
    ? Math.round(((user.currentStamina ?? 0) / MAX_STAMINA) * 100)
    : 0;

  useEffect(() => {
    if (
      !user ||
      (user.currentStamina ?? 0) >= MAX_STAMINA ||
      !user.lastStaminaUpdate
    ) {
      setRechargeTimeLeft("");
      return;
    }

    const updateTimer = () => {
      const now = new Date().getTime();
      const lastUpdate = new Date(user.lastStaminaUpdate!).getTime();
      const output = MAX_STAMINA - (user.currentStamina ?? 0);
      // Assuming 10 minutes per stamina point
      const RECHARGE_MS = 10 * 60 * 1000;

      // The time when we will reach MAX_STAMINA
      // Formula: LastUpdate + (PointsMissing * 10 mins)
      // Note: If lastStaminaUpdate is "when the last point was gained", then the next point is at lastUpdate + 10m.
      // Full state is when we gain 'output' points.
      const targetTime = lastUpdate + output * RECHARGE_MS;

      const diff = targetTime - now;

      if (diff <= 0) {
        setRechargeTimeLeft("");
        return;
      }

      const totalSeconds = Math.floor(diff / 1000);
      const h = Math.floor(totalSeconds / 3600);
      const m = Math.floor((totalSeconds % 3600) / 60);
      const s = totalSeconds % 60;

      if (h > 0) {
        setRechargeTimeLeft(`${h}h ${m}m`);
      } else {
        setRechargeTimeLeft(`${m}m ${s}s`);
      }
    };

    updateTimer(); // Initial call
    const interval = setInterval(updateTimer, 1000); // Live update
    return () => clearInterval(interval);
  }, [user?.currentStamina, user?.lastStaminaUpdate]);

  // SVG Config
  const size = 88; // Slightly larger
  const strokeWidth = 8;
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progressOffset = circumference * (1 - staminaPercentage / 100);

  // Derived Values for Bars
  const tasksRemaining = Math.min(user?.freeTasksRemaining || 0, 5);
  const tasksTotal = 5;
  const taskPercentage = (tasksRemaining / tasksTotal) * 100;

  const xpPercentage = userProgress?.progressPercent || 0;

  return (
    <View style={styles.container}>
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
            <View style={styles.iconBox}>
              <Icon name="fire" size={24} color="white" />
            </View>
          </View>

          {/* Glass Data Card - MAXIMALIST STACK */}
          <View style={styles.glassCard}>
            {/* 1. Energy Section (Full Width) */}
            <View style={styles.energySection}>
              <View style={styles.energyHeader}>
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                >
                  <View
                    style={[styles.iconCircle, { backgroundColor: "#FFF7ED" }]}
                  >
                    <Icon name="bolt" size={16} color="#F97316" solid />
                  </View>
                  <Text style={styles.sectionLabel}>Energy Tank</Text>
                </View>
                <Text style={styles.energyValue}>{staminaPercentage}%</Text>
              </View>

              <AnimatedBar percentage={staminaPercentage} color="#F97316" />

              <View style={styles.energyFooter}>
                {staminaPercentage === 100 ? (
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

            {/* 2. The Big Grid */}
            <View style={styles.gridContainer}>
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

              {/* Level Card - HUGE */}
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
                    {userLevel}
                  </Text>
                </View>
                {/* XP Text */}
                <Text style={[styles.xpText, { color: "#3B82F6" }]}>
                  {userProgress
                    ? `${userProgress.xpIntoLevel} / ${userProgress.xpForNextLevel} XP`
                    : "0 XP"}
                </Text>
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
    marginVertical: 4,
  },
  cardContainer: {
    marginVertical: 12,
    borderRadius: 24,
    shadowColor: theme.colors.actionPrimary.default,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    overflow: "hidden",
  },
  gradient: {
    borderRadius: 24,
    padding: 24,
    position: "relative",
  },
  bubbleTopRight: {
    position: "absolute",
    top: -60,
    right: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  bubbleBottomLeft: {
    position: "absolute",
    bottom: -50,
    left: -50,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
    zIndex: 1,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: "flex-start",
    marginBottom: 8,
    gap: 6,
  },
  chipText: {
    color: "white",
    fontSize: 12,
    fontWeight: "700",
  },
  cardTitle: {
    ...parseTextStyle(theme.typography.Heading2),
    color: "white",
    marginBottom: 2,
  },
  cardSubtitle: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: "rgba(255, 255, 255, 0.9)",
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },

  // Glass Card - Stack Layout
  glassCard: {
    flexDirection: "column", // Stack vertical
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    padding: 20, // More padding
    borderRadius: 24,
    zIndex: 1,
    gap: 20, // Space between sections
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
    fontSize: 24, // BIG
    fontWeight: "800",
    color: "#EA580C",
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

  // Grid Section
  gridContainer: {
    flexDirection: "row",
    gap: 16,
  },
  bigCard: {
    flex: 1,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: "space-between",
    overflow: "hidden",
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
    fontSize: 36, // MASSIVE
    fontWeight: "800",
    lineHeight: 40,
  },
  unitLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
  xpText: {
    marginTop: 8,
    fontSize: 12,
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
