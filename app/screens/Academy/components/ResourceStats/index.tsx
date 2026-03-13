import { useIsFocused, useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef } from "react";
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
import { TourGuideZone } from "rn-tourguide";
import { getProgressToNextLevel } from "../../../../api/users";
import { useUserStore } from "../../../../stores/user";
import { theme } from "../../../../Theme/tokens";
import { parseTextStyle } from "../../../../util/functions/parseStyles";

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
  onLayoutCapture,
}: {
  refreshing?: boolean;
  onLayoutCapture?: (order: number, event: any) => void;
}) => {
  const { width } = useWindowDimensions();
  const { user } = useUserStore();
  const isFocused = useIsFocused();
  const navigation = useNavigation<any>();
  const [rechargeTimeLeft, setRechargeTimeLeft] = React.useState<string>("");
  const [estimatedStamina, setEstimatedStamina] = React.useState<number>(
    user?.currentStamina ?? 0,
  );

  const userProgress = user
    ? getProgressToNextLevel(user.totalXp ?? 0)
    : undefined;
  const userLevel = userProgress?.currentLevel || 1;

  const currentMaxStamina = user?.maxStaminaCap || 80;

  const staminaPercentage = Math.min(
    100,
    Math.round((estimatedStamina / currentMaxStamina) * 100),
  );

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
      setRechargeTimeLeft("");
      if (user?.currentStamina !== undefined) {
        setEstimatedStamina(user.currentStamina);
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

      setEstimatedStamina(newEstimation);

      if (newEstimation >= currentMaxStamina) {
        setRechargeTimeLeft("");
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

      if (h > 0) {
        setRechargeTimeLeft(`${h}h ${m}m`);
      } else {
        setRechargeTimeLeft(`${m}m ${s}s`);
      }
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
            <TourGuideZone
              zone={3}
              text="Your daily fuel for practice! It recharges over time, so plan your sessions to keep the momentum going."
              shape="rectangle"
            >
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
            </TourGuideZone>

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
                <TourGuideZone
                  zone={4}
                  text="Daily Practice: Track your completed free activities here. Completing your daily goal earns you bonus XP and helps build a solid speech habit."
                  shape="rectangle"
                  style={{ flex: 1 }}
                >
                  <View
                    onLayout={(e) => {
                      const { x, y, width, height } = e.nativeEvent.layout;
                      const relativeY = y + gridOriginY.current;
                      const customEvent = {
                        nativeEvent: {
                          layout: { x, y: relativeY, width, height },
                        },
                      };
                      onLayoutCapture?.(4, customEvent);
                    }}
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
                </TourGuideZone>
              </View>

              <View
                style={[
                  styles.tileWrapper,
                  width < 320 && { flex: 0, width: "100%" },
                ]}
              >
                {/* Level Card - HUGE */}
                <TourGuideZone
                  zone={5}
                  text="Your Progress: Watch your level rise as you practice. Higher levels unlock new insights and demonstrate your commitment to mastering your speech."
                  shape="rectangle"
                  style={{ flex: 1 }}
                >
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() =>
                      navigation.navigate("AcademyStack", {
                        screen: "ProgressDetailStack",
                        params: {
                          screen: "ProgressDetail",
                          params: { scrollTo: "achievements" },
                        },
                      })
                    }
                    onLayout={(e) => {
                      const { x, y, width, height } = e.nativeEvent.layout;
                      const relativeY = y + gridOriginY.current;
                      const customEvent = {
                        nativeEvent: {
                          layout: { x, y: relativeY, width, height },
                        },
                      };
                      onLayoutCapture?.(5, customEvent);
                    }}
                    style={[
                      styles.bigCard,
                      { backgroundColor: "#F1F5F9", borderWidth: 0 },
                      width < 320 && { flex: 0, width: "100%" },
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
                    <Text
                      style={[
                        styles.xpText,
                        { color: theme.colors.library.orange[600] },
                      ]}
                    >
                      {userProgress
                        ? `${userProgress.xpIntoLevel} / ${userProgress.xpForNextLevel} XP`
                        : "0 XP"}
                    </Text>
                  </TouchableOpacity>
                </TourGuideZone>
              </View>
            </View>
          </View>
        </LinearGradient>
      </View>
    </View>
  );
};

export default React.memo(ResourceStats);

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
  tileWrapper: {
    flex: 1,
  },
  bigCard: {
    flex: 1,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
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
