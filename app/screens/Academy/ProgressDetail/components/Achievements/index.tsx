import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState, useRef, useMemo } from "react";
import { StyleSheet, Text, View, Animated, Dimensions, ScrollView } from "react-native";
import Icon from "react-native-vector-icons/FontAwesome5";
import { useUserStore } from "../../../../../stores/user";
import { theme } from "../../../../../Theme/tokens";
import { getLevelStage, LevelStage } from "../../../../../api/users";
import {
    parseTextStyle
} from "../../../../../util/functions/parseStyles";
import SeekerFace from "../../../../../assets/sw-faces/SeekerFace";
import PathfinderFace from "../../../../../assets/sw-faces/PathfinderFace";
import VanguardFace from "../../../../../assets/sw-faces/VanguardFace";
import CatalystFace from "../../../../../assets/sw-faces/CatalystFace";
import BeaconFace from "../../../../../assets/sw-faces/BeaconFace";

const { width: windowWidth } = Dimensions.get("window");

type LevelFaceComp = React.ComponentType<{
  size?: number;
  shouldAnimate?: boolean;
  transparentBg?: boolean;
}>;

const LEVEL_FACES: Record<string, LevelFaceComp> = {
  seeker: SeekerFace,
  pathfinder: PathfinderFace,
  vanguard: VanguardFace,
  catalyst: CatalystFace,
  beacon: BeaconFace,
};

type AchievementsProps = {
  stageData?: LevelStage | null;
};

const Achievements = ({ stageData }: AchievementsProps) => {
  const { user } = useUserStore();
  const [stage, setStage] = useState<LevelStage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);

  const scrollX = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<ScrollView>(null);
  
  const slideWidth = windowWidth - 100; // Original width logic
  const spacing = 12;
  const gradientPadding = 20; // Matches styles.gradient paddingHorizontal
  const horizontalPadding = (windowWidth - gradientPadding * 2 - slideWidth) / 2;

  useEffect(() => {
    if (stageData) {
      setStage(stageData);
      if (stageData?.stages?.length) {
        const currentIndex = stageData.stages.findIndex((s) => {
          const isCurrent =
            stageData.level >= s.minLevel &&
            (s.maxLevel === null || stageData.level <= s.maxLevel);
          return isCurrent;
        });

        if (currentIndex !== -1) {
          setActiveIndex(currentIndex);
          setTimeout(() => {
            scrollRef.current?.scrollTo({
              x: currentIndex * (slideWidth + spacing),
              animated: false,
            });
          }, 100);
        }
      }
      setIsLoading(false);
      return;
    }

    if (!user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    getLevelStage()
      .then((data) => {
        setStage(data);
        if (data?.stages && data.stages.length > 0) {
          // Find the current stage index to auto-scroll
          const currentIndex = data.stages.findIndex((s) => {
            const isCurrent = data.level >= s.minLevel && (s.maxLevel === null || data.level <= s.maxLevel);
            return isCurrent;
          });
          
          if (currentIndex !== -1) {
            setActiveIndex(currentIndex);
            // Wait for layout then scroll
            setTimeout(() => {
              scrollRef.current?.scrollTo({
                x: currentIndex * (slideWidth + spacing),
                animated: true,
              });
            }, 500);
          }
        }
      })
      .catch((err) => {
        console.error(err);
      })
      .finally(() => setIsLoading(false));
  }, [stageData, user]);

  const activeTotalXp = stage?.totalXp ?? user?.totalXp ?? 0;
  const xpIntoLevel = Math.max(0, activeTotalXp - (stage?.currentLevelXpFloor || 0));
  const xpForNextLevel = Math.max(1, (stage?.nextLevelXpCeiling || 100) - (stage?.currentLevelXpFloor || 0));
  const xpRemaining = xpForNextLevel - xpIntoLevel;
  const progressPercent = Math.min(100, Math.round((xpIntoLevel / xpForNextLevel) * 100));

  const scrollHandler = useMemo(
    () =>
      Animated.event(
        [{ nativeEvent: { contentOffset: { x: scrollX } } }], 
        {
          useNativeDriver: true,
          listener: (event: any) => {
            const offsetX = event.nativeEvent.contentOffset.x;
            const index = Math.round(offsetX / (slideWidth + spacing));
            if (index !== activeIndex && index >= 0 && stage?.stages && index < stage.stages.length) {
              setActiveIndex(index);
            }
          }
        }
      ),
    [scrollX, slideWidth, spacing, activeIndex, stage?.stages]
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
              <Text style={styles.xpText}>{isLoading ? "..." : activeTotalXp} XP</Text>
            </View>

            {/* Progress Bar or Empty State */}
            {isLoading ? (
              <View style={[styles.progressContainer, { justifyContent: "center", alignItems: "center", paddingVertical: 12 }]}>
                 <Text style={[styles.progressText, { opacity: 0.7 }]}>Synchronizing Data...</Text>
              </View>
            ) : activeTotalXp > 0 ? (
              <View style={styles.progressContainer}>
                <View style={styles.progressBarWrapper}>
                  <View style={styles.progressBarBg}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${progressPercent}%`,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.progressText}>
                    {xpRemaining < 50 ? "Almost there! " : ""}
                    Only {xpRemaining} XP more for Level {stage ? stage.level + 1 : 2}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.emptyXpContainer}>
                <Text style={styles.emptyXpTitle}>Unlock Your Potential</Text>
                <Text style={styles.emptyXpSubtitle}>
                  Earn XP with every practice.
                </Text>
              </View>
            )}
          </View>

          {/* Stage Carousel Layer */}
          <View style={styles.carouselContainer}>
            {isLoading ? (
               <View style={styles.levelRow}>
                 <View style={styles.levelInfo}>
                   <Text style={[styles.levelTitle, { opacity: 0.6 }]}>
                     Loading Stages...
                   </Text>
                 </View>
               </View>
            ) : stage?.stages && stage.stages.length > 0 ? (
              <View>
                <Animated.ScrollView
                  ref={scrollRef}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  snapToInterval={slideWidth + spacing}
                  snapToAlignment="start"
                  decelerationRate="fast"
                  style={styles.scrollViewStyle}
                  contentContainerStyle={[
                    styles.carouselContent, 
                    { 
                      gap: spacing, 
                      paddingHorizontal: horizontalPadding 
                    }
                  ]}
                  onScroll={scrollHandler}
                  scrollEventThrottle={16}
                >
                  {stage.stages.map((s, index) => {
                    const isUnlocked = stage.level >= s.minLevel;
                    const isCurrent = stage.level >= s.minLevel && (s.maxLevel === null || stage.level <= s.maxLevel);
                    const StageFace = LEVEL_FACES[s.title?.toLowerCase().split(" ")[0] ?? ""];

                    return (
                      <View
                        key={s.title}
                        style={[
                          styles.levelPreviewCard,
                          { width: slideWidth },
                          isUnlocked ? styles.unlockedCard : styles.lockedCard
                        ]}
                      >
                        {/* Stage character (full face, fully visible) */}
                        {StageFace && (
                          <View
                            style={[
                              styles.innerFaceWatermark,
                              { opacity: isUnlocked ? 1 : 0.4 },
                            ]}
                            pointerEvents="none"
                          >
                            <StageFace size={84} shouldAnimate={isUnlocked} />
                          </View>
                        )}

                        {/* Current Stage Ribbon */}
                        {isCurrent && (
                          <View style={styles.currentBadge}>
                            <Text style={styles.currentBadgeText}>You're here</Text>
                          </View>
                        )}

                        <View style={styles.cardHeaderRow}>
                          <View
                            style={[
                              styles.levelBadge,
                              isUnlocked ? styles.unlockedBadge : styles.lockedBadge
                            ]}
                          >
                            <Icon 
                              name={isUnlocked ? "medal" : "lock"} 
                              size={isUnlocked ? 24 : 16} 
                              color={isUnlocked ? "#FFF" : "rgba(255,255,255,0.6)"} 
                            />
                          </View>
                          <View style={styles.levelInfo}>
                            <Text style={[styles.stageBounds, !isUnlocked && styles.lockedText]}>
                              {isCurrent 
                                ? `CURRENT STAGE • LEVEL ${stage.level}`
                                : isUnlocked
                                  ? `COMPLETED • LVLS ${s.minLevel}-${s.maxLevel}`
                                  : `LOCKED • LVLS ${s.minLevel}-${s.maxLevel || '50+'}`
                              }
                            </Text>
                            <Text style={[styles.levelTitle, !isUnlocked && styles.lockedText]}>
                              {s.title}
                            </Text>
                          </View>
                        </View>

                        <Text style={[styles.levelDesc, !isUnlocked && styles.lockedText]}>
                          {isUnlocked 
                            ? s.progressReportCopy || s.shortDescription 
                            : `Reach Level ${s.minLevel} to unlock.`}
                        </Text>
                      </View>
                    );
                  })}
                </Animated.ScrollView>
                
                {/* Pagination Dots */}
                <View style={styles.dotsContainer}>
                  {stage.stages.map((_, index) => (
                    <View
                      key={`dot-${index}`}
                      style={[
                        styles.dot,
                        activeIndex === index ? styles.activeDot : styles.inactiveDot
                      ]}
                    />
                  ))}
                </View>
              </View>
            ) : null}
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
    marginHorizontal: -20, // Negative of gradient padding for edge-to-edge scroll
    marginTop: -8, 
  },
  scrollViewStyle: {
    overflow: "visible",
  },
  carouselContent: {
    paddingTop: 16, // Space for the popped badge
    paddingBottom: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 3,
  },
  activeDot: {
    backgroundColor: "#FFF",
    width: 14, // Pill shape for active dot
  },
  inactiveDot: {
    backgroundColor: "rgba(255,255,255,0.4)",
  },
  dotsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 18,
    gap: 0,
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
    justifyContent: "center",
  },
  stageBounds: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: "rgba(255,255,255,0.7)",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 2,
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
    lineHeight: 16,
    paddingRight: 92, // reserve a gutter so text wraps clear of the face
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 10,
  },
  emptyXpContainer: {
    gap: 4,
  },
  emptyXpTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#FFF",
    letterSpacing: -0.5,
  },
  emptyXpSubtitle: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: "rgba(255,255,255,0.9)",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  levelPreviewCard: {
    flexDirection: "column",
    backgroundColor: "rgba(255,255,255,0.1)",
    padding: 16,
    borderRadius: 16,
    alignItems: "flex-start",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    position: "relative",
    overflow: "visible", // Critical fix for badge clipping
  },
  innerFaceWatermark: {
    position: "absolute",
    right: 12,
    bottom: 12, // fully inside the card so the whole face + circle shows
    zIndex: 0, // behind the text content
    // opacity set inline: 1 unlocked, 0.4 locked (ghosted)
  },
  unlockedCard: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderColor: "rgba(255,255,255,0.25)",
    borderStyle: "solid",
  },
  lockedCard: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderColor: "rgba(255,255,255,0.1)",
    borderStyle: "dashed",
  },
  unlockedBadge: {
    backgroundColor: "rgba(255,255,255,0.3)",
    borderColor: "rgba(255,255,255,0.4)",
  },
  lockedBadge: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "rgba(255,255,255,0.15)",
  },
  lockedText: {
    opacity: 0.5,
  },
  lockIcon: {
    position: "absolute",
    top: 12,
    right: 12,
    opacity: 0.6,
  },
});
