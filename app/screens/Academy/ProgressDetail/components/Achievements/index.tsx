import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState, useRef, useMemo } from "react";
import { StyleSheet, Text, View, Animated, Dimensions } from "react-native";
import Icon from "react-native-vector-icons/FontAwesome5";
import { useUserStore } from "../../../../../stores/user";
import { theme } from "../../../../../Theme/tokens";
import {
    getProgressToNextLevel,
    getUnlockedLevelsFromXP,
    LevelData,
    LevelProgress,
} from "../../../../../util/functions/levels-xp";
import {
    parseTextStyle
} from "../../../../../util/functions/parseStyles";

const Achievements = () => {
  const { user } = useUserStore();
  const [unlockedLevels, setUnlockedLevels] = useState<
    { level: number; data: LevelData }[]
  >([]);

  const [levelProgress, setLevelProgress] = useState<LevelProgress | null>(
    null
  );

  useEffect(() => {
    if (!user?.totalXp) return;
    const levelsUnlocked = getUnlockedLevelsFromXP(user.totalXp);
    const progress = getProgressToNextLevel(user.totalXp);
    setUnlockedLevels([...levelsUnlocked].reverse());
    setLevelProgress(progress);
  }, [user?.totalXp]);

  const scrollX = useRef(new Animated.Value(0)).current;
  const slideWidth = Dimensions.get("window").width - 100; // Account for container padding and small preview
  const spacing = 12;

  const scrollHandler = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
        useNativeDriver: true,
      }),
    [scrollX]
  );

  return (
    <View style={styles.shadowContainer}>
      <LinearGradient
        colors={["#10B981", "#059669"]} // Green gradient
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Watermark Bubbles */}
        <View style={styles.bubbleTopRight} />
        <View style={styles.bubbleBottomLeft} />

        {/* Trophy Icon Watermark */}
        <View style={styles.iconWatermark}>
          <Icon name="trophy" size={140} color="rgba(255,255,255,0.08)" />
        </View>

        {/* Content Layer */}
        <View style={styles.contentLayer}>
          {/* Header with XP */}
          <View style={styles.headerSection}>
            <View style={styles.headerRow}>
              <Text style={styles.headerLabel}>ACHIEVEMENTS</Text>
              <Icon name="award" size={20} color="rgba(255,255,255,0.9)" />
            </View>

            {/* XP Badge */}
            <View style={styles.xpBadge}>
              <Icon name="star" size={16} color="rgba(255,255,255,0.9)" />
              <Text style={styles.xpText}>{user?.totalXp || 0} XP</Text>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressContainer}>
              <View style={styles.progressBarWrapper}>
                <View style={styles.progressBarBg}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${
                          ((levelProgress?.xpIntoLevel || 0) /
                            (levelProgress?.xpForNextLevel || 100)) *
                          100
                        }%`,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.progressText}>
                  {Math.round(
                    ((levelProgress?.xpIntoLevel || 0) /
                      (levelProgress?.xpForNextLevel || 100)) *
                      100
                  )}
                  % to next level
                </Text>
              </View>
            </View>
          </View>

          {/* Levels Carousel */}
          <View style={styles.carouselContainer}>
            <Animated.ScrollView
              horizontal
              pagingEnabled={false}
              showsHorizontalScrollIndicator={false}
              snapToInterval={slideWidth + spacing}
              decelerationRate="fast"
              snapToAlignment="start"
              onScroll={scrollHandler}
              scrollEventThrottle={16}
              contentContainerStyle={styles.carouselContent}
              style={{ overflow: "visible" }} // Ensure badge doesn't get cut
            >
              {unlockedLevels.map(({ level, data }, index) => {
                const isCurrentLevel = level === Math.max(...unlockedLevels.map((l) => l.level));
                return (
                  <View
                    key={level}
                    style={[
                      styles.levelRow,
                      {
                        width: slideWidth,
                        marginRight:
                          index === unlockedLevels.length - 1 ? 0 : spacing,
                      },
                    ]}
                  >
                    {isCurrentLevel && (
                      <View style={styles.currentBadge}>
                        <Text style={styles.currentBadgeText}>You're here</Text>
                      </View>
                    )}
                    <View style={styles.levelBadge}>{data.icon(32)}</View>
                    <View style={styles.levelInfo}>
                      <Text style={styles.levelTitle}>
                        Level {level}: {data.levelTitle}
                      </Text>
                      <Text numberOfLines={2} style={styles.levelDesc}>
                        {data.levelDescription}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </Animated.ScrollView>

            {/* Pagination Dots */}
            {unlockedLevels.length > 1 && (
              <View style={styles.dotsContainer}>
                {unlockedLevels.map((_, index) => {
                  const inputRange = [
                    (index - 1) * (slideWidth + spacing),
                    index * (slideWidth + spacing),
                    (index + 1) * (slideWidth + spacing),
                  ];

                  const opacity = scrollX.interpolate({
                    inputRange,
                    outputRange: [0.4, 1, 0.4],
                    extrapolate: "clamp",
                  });

                  const scale = scrollX.interpolate({
                    inputRange,
                    outputRange: [1, 1.25, 1],
                    extrapolate: "clamp",
                  });

                  return (
                    <Animated.View
                      key={index}
                      style={[
                        styles.dot,
                        {
                          opacity,
                          transform: [{ scale }],
                        },
                      ]}
                    />
                   );
                })}
              </View>
            )}
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};

export default Achievements;

const styles = StyleSheet.create({
  shadowContainer: {
    borderRadius: 24,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    backgroundColor: "#A7F3D0",
    overflow: "hidden",
  },
  gradient: {
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 22,
    minHeight: 280,
    position: "relative",
  },
  // Watermark Bubbles
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
  iconWatermark: {
    position: "absolute",
    right: -40,
    bottom: -30,
    opacity: 0.6,
  },
  contentLayer: {
    flex: 1,
    zIndex: 1,
    gap: 20,
  },
  headerSection: {
    gap: 12,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLabel: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: "rgba(255,255,255,0.9)",
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  xpBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  xpText: {
    fontSize: 18,
    fontWeight: "900",
    color: "#FFF",
    letterSpacing: -0.5,
  },
  progressContainer: {
    gap: 8,
  },
  progressBarWrapper: {
    gap: 8,
  },
  progressBarBg: {
    height: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 6,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#FFF",
    borderRadius: 6,
  },
  progressText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
    fontWeight: "600",
  },
  carouselContainer: {
    marginHorizontal: -4,
    paddingTop: 12, // Add space for the popped badge
    marginTop: -8, // Compensate for padding to maintain visual balance
  },
  carouselContent: {
    paddingRight: 20,
    paddingTop: 4, // Inner padding for smooth overlap
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FFF",
    marginHorizontal: 4,
  },
  dotsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 16,
    gap: 4,
  },
  levelRow: {
    flexDirection: "row",
    gap: 14,
    backgroundColor: "rgba(255,255,255,0.15)",
    padding: 14,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    position: "relative",
  },
  currentBadge: {
    position: "absolute",
    top: -10,
    right: -6,
    backgroundColor: "#F43F5E", // Vibrant coral color
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    zIndex: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  currentBadgeText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: "#FFF", 
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  levelBadge: {
    width: 48, // Slightly smaller icons for carousel fit
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.25)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
  },
  levelInfo: {
    flex: 1,
    gap: 2,
  },
  levelTitle: {
    ...parseTextStyle(theme.typography.Body),
    color: "#FFF",
    fontSize: 13,
    fontWeight: "700",
  },
  levelDesc: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: "rgba(255,255,255,0.85)",
    fontSize: 11,
    fontWeight: "500",
    lineHeight: 14,
  },
});
