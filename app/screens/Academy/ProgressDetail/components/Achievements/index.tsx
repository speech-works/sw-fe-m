import React, { useEffect, useState, useRef, useMemo } from "react";
import { StyleSheet, View, Animated, Dimensions, ScrollView } from "react-native";
import { useUserStore } from "../../../../../stores/user";
import { getLevelStage, LevelStage } from "../../../../../api/users";
import { UserAvatar } from "../../../../../components/UserAvatar";
import { manifestWithStageKit } from "../../../../../assets/avatar/registry";
import { normalizeManifest, StageIndex } from "../../../../../types/avatar";
import {
  useTheme,
  spacing,
  radius,
  borderWidth,
  size,
  fonts,
  Text,
  Icon,
  icons,
} from "../../../../../design-system";

const { width: windowWidth } = Dimensions.get("window");
const SLIDE_GAP = 12;
const CARD_PAD = spacing["2xl"]; // card horizontal padding (for edge-to-edge carousel math)

type AchievementsProps = {
  stageData?: LevelStage | null;
};

const Achievements = ({ stageData }: AchievementsProps) => {
  const { colors } = useTheme();
  const { user } = useUserStore();
  // The user's own avatar (their identity — skin/hair/face stay theirs); each
  // stage card overrides only the gear slots with that stage's kit.
  const baseManifest = useMemo(
    () => normalizeManifest(user?.avatarManifest),
    [user?.avatarManifest],
  );
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
          <Icon name={icons.win} size={size.icon} color={colors.text.tertiary} />
        </View>

        <View style={[styles.xpBadge, { backgroundColor: colors.surface.default, borderColor: colors.border.hairline }]}>
          <Icon name={icons.proud} size={14} color={colors.feedback.warningText} />
          <Text variant="bodySm" style={styles.bold}>{isLoading ? "..." : activeTotalXp} XP</Text>
        </View>

        {isLoading ? (
          <Text variant="bodySm" color="secondary">Synchronizing Data…</Text>
        ) : activeTotalXp > 0 ? (
          <View style={styles.progress}>
            <View style={[styles.progressBg, { backgroundColor: colors.surface.control, borderColor: colors.border.strong }]}>
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
            {stage.stages.map((s, i) => {
              const isUnlocked = stage.level >= s.minLevel;
              const isCurrent =
                stage.level >= s.minLevel && (s.maxLevel === null || stage.level <= s.maxLevel);
              // YOUR avatar wearing this stage's kit (index-keyed, so it can
              // never mis-map a server title — the old title→face lookup wrongly
              // locked Voyager/North Star). Only the current stage animates.
              const stageIndex = Math.min(i, 4) as StageIndex;
              const kitManifest = manifestWithStageKit(baseManifest, stageIndex);

              return (
                <View
                  key={s.title}
                  style={[
                    styles.stageCard,
                    { width: slideWidth, backgroundColor: colors.surface.default, borderColor: colors.border.default },
                    !isUnlocked && styles.lockedCard,
                  ]}
                >
                  {isCurrent ? (
                    <View style={[styles.hereChip, { backgroundColor: colors.action.primary }]}>
                      <Text variant="caption" color={colors.action.onPrimary} style={styles.bold}>
                        You're here
                      </Text>
                    </View>
                  ) : null}

                  <View style={styles.stageHeader}>
                    <View style={styles.stageAvatar}>
                      <View style={!isUnlocked ? styles.dimmed : undefined}>
                        <UserAvatar
                          manifest={kitManifest}
                          size={60}
                          animate={isCurrent}
                          accessibilityLabel={`Your avatar as ${s.title}`}
                        />
                      </View>
                      {!isUnlocked ? (
                        <View style={[styles.lockBadge, { backgroundColor: colors.surface.control, borderColor: colors.border.default }]}>
                          <Icon name={icons.locked} size={12} color={colors.text.tertiary} />
                        </View>
                      ) : null}
                    </View>
                    <View style={styles.flex1}>
                      <Text variant="h3" style={!isUnlocked ? styles.locked : undefined}>{s.title}</Text>
                      <Text variant="caption" color="tertiary" style={[styles.stageBounds, !isUnlocked && styles.locked]}>
                        {isCurrent
                          ? `Current · Level ${stage.level}`
                          : isUnlocked
                            ? `Completed · Levels ${s.minLevel}–${s.maxLevel}`
                            : `Levels ${s.minLevel}–${s.maxLevel || "50+"}`}
                      </Text>
                    </View>
                  </View>

                  <Text variant="bodySm" color="secondary" style={!isUnlocked ? styles.locked : undefined}>
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
    borderWidth: StyleSheet.hairlineWidth,
  },
  progress: {
    gap: spacing.sm,
  },
  progressBg: {
    height: 10,
    borderRadius: radius.full,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
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
    borderRadius: radius.card,
    padding: spacing.xl,
    borderWidth: borderWidth.thin,
    gap: spacing.lg,
    minHeight: 210,
    position: "relative",
  },
  lockedCard: {
    borderStyle: "dashed",
    opacity: 0.9,
  },
  flex1: { flex: 1 },
  stageHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  stageAvatar: {
    width: 60,
    height: 60,
    position: "relative",
  },
  dimmed: { opacity: 0.45 },
  lockBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 20,
    height: 20,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: "center",
    alignItems: "center",
  },
  stageBounds: {
    marginTop: spacing.xxs,
  },
  hereChip: {
    position: "absolute",
    top: -10,
    right: spacing.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    zIndex: 2,
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
    borderRadius: radius.full,
  },
  activeDot: {
    width: 16,
  },
});
