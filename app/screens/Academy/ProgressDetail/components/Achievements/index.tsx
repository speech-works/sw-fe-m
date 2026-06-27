import React, { useEffect, useState, useRef, useMemo } from "react";
import { StyleSheet, View, Animated, Dimensions, ScrollView } from "react-native";
import Icon from "react-native-vector-icons/FontAwesome5";
import { useUserStore } from "../../../../../stores/user";
import { getLevelStage, LevelStage } from "../../../../../api/users";
import SeekerFace from "../../../../../assets/sw-faces/SeekerFace";
import PathfinderFace from "../../../../../assets/sw-faces/PathfinderFace";
import VanguardFace from "../../../../../assets/sw-faces/VanguardFace";
import CatalystFace from "../../../../../assets/sw-faces/CatalystFace";
import BeaconFace from "../../../../../assets/sw-faces/BeaconFace";
import {
  useTheme,
  spacing,
  radius,
  size,
  fonts,
  Text,
} from "../../../../../design-system";

const { width: windowWidth } = Dimensions.get("window");
const SLIDE_GAP = 12;
const CARD_PAD = spacing["2xl"]; // card horizontal padding (for edge-to-edge carousel math)

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
  const { colors } = useTheme();
  const { user } = useUserStore();
  const [stage, setStage] = useState<LevelStage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);

  const scrollX = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<ScrollView>(null);

  const slideWidth = windowWidth - 100;
  const horizontalPadding = (windowWidth - CARD_PAD * 2 - slideWidth) / 2;

  useEffect(() => {
    if (stageData) {
      setStage(stageData);
      if (stageData?.stages?.length) {
        const currentIndex = stageData.stages.findIndex(
          (s) =>
            stageData.level >= s.minLevel &&
            (s.maxLevel === null || stageData.level <= s.maxLevel),
        );
        if (currentIndex !== -1) {
          setActiveIndex(currentIndex);
          setTimeout(() => {
            scrollRef.current?.scrollTo({
              x: currentIndex * (slideWidth + SLIDE_GAP),
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
          const currentIndex = data.stages.findIndex(
            (s) =>
              data.level >= s.minLevel &&
              (s.maxLevel === null || data.level <= s.maxLevel),
          );
          if (currentIndex !== -1) {
            setActiveIndex(currentIndex);
            setTimeout(() => {
              scrollRef.current?.scrollTo({
                x: currentIndex * (slideWidth + SLIDE_GAP),
                animated: true,
              });
            }, 500);
          }
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setIsLoading(false));
  }, [stageData, user]);

  const activeTotalXp = stage?.totalXp ?? user?.totalXp ?? 0;
  const xpIntoLevel = Math.max(0, activeTotalXp - (stage?.currentLevelXpFloor || 0));
  const xpForNextLevel = Math.max(
    1,
    (stage?.nextLevelXpCeiling || 100) - (stage?.currentLevelXpFloor || 0),
  );
  const xpRemaining = xpForNextLevel - xpIntoLevel;
  const progressPercent = Math.min(100, Math.round((xpIntoLevel / xpForNextLevel) * 100));

  const scrollHandler = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
        useNativeDriver: true,
        listener: (event: any) => {
          const offsetX = event.nativeEvent.contentOffset.x;
          const index = Math.round(offsetX / (slideWidth + SLIDE_GAP));
          if (index !== activeIndex && index >= 0 && stage?.stages && index < stage.stages.length) {
            setActiveIndex(index);
          }
        },
      }),
    [scrollX, slideWidth, activeIndex, stage?.stages],
  );

  return (
    <View style={[styles.card, { backgroundColor: colors.surface.elevated }]}>
      {/* Header + XP */}
      <View style={styles.headerSection}>
        <View style={styles.headerRow}>
          <Text variant="label" color="tertiary" style={styles.eyebrow}>ACHIEVEMENTS</Text>
          <Icon name="award" size={size.icon} color={colors.text.tertiary} />
        </View>

        <View style={[styles.xpBadge, { backgroundColor: colors.surface.default }]}>
          <Icon name="star" size={14} color={colors.gamification.gold} />
          <Text variant="bodySm" style={styles.bold}>{isLoading ? "..." : activeTotalXp} XP</Text>
        </View>

        {isLoading ? (
          <Text variant="bodySm" color="secondary">Synchronizing Data…</Text>
        ) : activeTotalXp > 0 ? (
          <View style={styles.progress}>
            <View style={[styles.progressBg, { backgroundColor: colors.surface.control }]}>
              <View style={[styles.progressFill, { width: `${progressPercent}%`, backgroundColor: colors.gamification.gold }]} />
            </View>
            <Text variant="caption" color="secondary">
              {xpRemaining < 50 ? "Almost there! " : ""}
              Only {xpRemaining} XP more for Level {stage ? stage.level + 1 : 2}
            </Text>
          </View>
        ) : (
          <View style={styles.emptyXp}>
            <Text variant="h3">Unlock Your Potential</Text>
            <Text variant="bodySm" color="secondary">Earn XP with every practice.</Text>
          </View>
        )}
      </View>

      {/* Stage carousel */}
      {!isLoading && stage?.stages && stage.stages.length > 0 ? (
        <View style={styles.carouselContainer}>
          <Animated.ScrollView
            ref={scrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={slideWidth + SLIDE_GAP}
            snapToAlignment="start"
            decelerationRate="fast"
            style={styles.scrollViewStyle}
            contentContainerStyle={[styles.carouselContent, { gap: SLIDE_GAP, paddingHorizontal: horizontalPadding }]}
            onScroll={scrollHandler}
            scrollEventThrottle={16}
          >
            {stage.stages.map((s) => {
              const isUnlocked = stage.level >= s.minLevel;
              const isCurrent =
                stage.level >= s.minLevel && (s.maxLevel === null || stage.level <= s.maxLevel);
              const StageFace = LEVEL_FACES[s.title?.toLowerCase().split(" ")[0] ?? ""];

              return (
                <View
                  key={s.title}
                  style={[
                    styles.stageCard,
                    { width: slideWidth, backgroundColor: colors.surface.default, borderColor: colors.border.default },
                    !isUnlocked && styles.lockedCard,
                  ]}
                >
                  {StageFace ? (
                    <View style={[styles.stageFace, { opacity: isUnlocked ? 1 : 0.35 }]} pointerEvents="none">
                      <StageFace size={84} shouldAnimate={isUnlocked} />
                    </View>
                  ) : null}

                  {isCurrent ? (
                    <View style={[styles.currentBadge, { backgroundColor: colors.action.primary }]}>
                      <Text variant="caption" color={colors.action.onPrimary} style={styles.currentBadgeText}>
                        You're here
                      </Text>
                    </View>
                  ) : null}

                  <View style={styles.cardHeaderRow}>
                    <View style={[styles.stageBadge, { backgroundColor: colors.surface.control }]}>
                      <Icon
                        name={isUnlocked ? "medal" : "lock"}
                        size={isUnlocked ? 22 : 16}
                        color={isUnlocked ? colors.gamification.gold : colors.text.tertiary}
                      />
                    </View>
                    <View style={styles.stageInfo}>
                      <Text variant="caption" color="tertiary" style={[styles.stageBounds, !isUnlocked && styles.locked]}>
                        {isCurrent
                          ? `CURRENT STAGE • LEVEL ${stage.level}`
                          : isUnlocked
                            ? `COMPLETED • LVLS ${s.minLevel}-${s.maxLevel}`
                            : `LOCKED • LVLS ${s.minLevel}-${s.maxLevel || "50+"}`}
                      </Text>
                      <Text variant="body" style={[styles.bold, !isUnlocked && styles.locked]}>{s.title}</Text>
                    </View>
                  </View>

                  <Text variant="bodySm" color="secondary" style={[styles.stageDesc, !isUnlocked && styles.locked]}>
                    {isUnlocked
                      ? s.progressReportCopy || s.shortDescription
                      : `Reach Level ${s.minLevel} to unlock.`}
                  </Text>
                </View>
              );
            })}
          </Animated.ScrollView>

          <View style={styles.dotsContainer}>
            {stage.stages.map((_, index) => (
              <View
                key={`dot-${index}`}
                style={[
                  styles.dot,
                  { backgroundColor: activeIndex === index ? colors.action.primary : colors.surface.control },
                  activeIndex === index && styles.activeDot,
                ]}
              />
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
};

export default Achievements;

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    padding: CARD_PAD,
    gap: spacing["2xl"],
    overflow: "hidden",
  },
  bold: { fontFamily: fonts.bold },
  eyebrow: { letterSpacing: 1, textTransform: "uppercase" },
  headerSection: {
    gap: spacing.md,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  xpBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    alignSelf: "flex-start",
  },
  progress: {
    gap: spacing.sm,
  },
  progressBg: {
    height: 10,
    borderRadius: radius.full,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: radius.full,
  },
  emptyXp: {
    gap: spacing.xxs,
  },
  carouselContainer: {
    marginHorizontal: -CARD_PAD,
  },
  scrollViewStyle: {
    overflow: "visible",
  },
  carouselContent: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  stageCard: {
    borderRadius: radius.input,
    padding: spacing.lg,
    alignItems: "flex-start",
    borderWidth: 1,
    position: "relative",
    overflow: "visible",
  },
  lockedCard: {
    borderStyle: "dashed",
    opacity: 0.85,
  },
  stageFace: {
    position: "absolute",
    right: spacing.md,
    bottom: spacing.md,
    zIndex: 0,
  },
  currentBadge: {
    position: "absolute",
    top: -10,
    right: -4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    zIndex: 2,
  },
  currentBadgeText: {
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontFamily: fonts.bold,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  stageBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  stageInfo: {
    flex: 1,
    gap: spacing.xxs,
    justifyContent: "center",
  },
  stageBounds: {
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  stageDesc: {
    paddingRight: 92, // gutter so text wraps clear of the face
  },
  locked: { opacity: 0.5 },
  dotsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: spacing.lg,
    gap: spacing.xs,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  activeDot: {
    width: 16,
  },
});
