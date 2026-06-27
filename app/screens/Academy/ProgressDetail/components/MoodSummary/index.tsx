import React from "react";
import { StyleSheet, View } from "react-native";
import Icon from "react-native-vector-icons/FontAwesome5";
import {
  useTheme,
  spacing,
  radius,
  size,
  fonts,
  Text,
  Skeleton,
} from "../../../../../design-system";
import { getMoodRemark } from "./helper";

/** Mood → semantic accent (happy=warm, calm=green, sad=blue, angry=red). */
const MOOD_COLOR = {
  HAPPY: "warning",
  CALM: "success",
  SAD: "info",
  ANGRY: "danger",
} as const;

const moodName = (mood: string) =>
  mood.charAt(0) + mood.slice(1).toLowerCase();

export const MoodSummarySkeleton = () => {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface.elevated }]}>
      <View style={styles.headerRow}>
        <View style={styles.skeletonHeaderText}>
          <Skeleton width={100} height={12} />
          <Skeleton width={160} height={14} />
        </View>
        <Skeleton width={20} height={20} />
      </View>
      <View style={styles.moodList}>
        {[1, 2].map((i) => (
          <View key={i} style={styles.moodRow}>
            <Skeleton width={80} height={14} />
            <Skeleton width={"100%"} height={8} radius={4} />
          </View>
        ))}
      </View>
    </View>
  );
};

type MoodSummaryProps = {
  moodStats: Record<string, number> | null;
  loading?: boolean;
  hasError?: boolean;
};

const MoodSummary = ({
  moodStats,
  loading = false,
  hasError = false,
}: MoodSummaryProps) => {
  const { colors } = useTheme();

  if (loading && !moodStats) {
    return <MoodSummarySkeleton />;
  }
  if (!moodStats) {
    return null;
  }

  const moodColor = (mood: string) => {
    const key = MOOD_COLOR[mood as keyof typeof MOOD_COLOR];
    return key ? colors.accent[key] : colors.text.tertiary;
  };

  const nonZeroMoods = (Object.entries(moodStats) as [string, number][])
    .filter(([, percentage]) => percentage > 0)
    .sort((a, b) => b[1] - a[1]);

  return (
    <View style={[styles.card, { backgroundColor: colors.surface.elevated }]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.flex1}>
          <Text variant="label" color="tertiary" style={styles.eyebrow}>
            MOOD SUMMARY
          </Text>
          <Text variant="bodySm" color="secondary">How you felt this week</Text>
        </View>
        <View style={styles.headerRight}>
          {hasError && (
            <Icon name="exclamation-circle" size={14} color={colors.feedback.dangerText} style={styles.headerErrorIcon} />
          )}
          <Icon name="smile" size={size.icon} color={colors.text.tertiary} />
        </View>
      </View>

      {nonZeroMoods.length > 0 ? (
        <View style={styles.moodList}>
          {nonZeroMoods.map(([mood, pct]) => (
            <View key={mood} style={styles.moodRow}>
              <View style={styles.moodRowHeader}>
                <View style={styles.moodLabel}>
                  <View style={[styles.dot, { backgroundColor: moodColor(mood) }]} />
                  <Text variant="body" style={styles.bold}>{moodName(mood)}</Text>
                </View>
                <Text variant="body" color="secondary">{pct.toFixed(1)}%</Text>
              </View>
              <View style={[styles.track, { backgroundColor: colors.surface.control }]}>
                <View style={[styles.fill, { width: `${pct}%`, backgroundColor: moodColor(mood) }]} />
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.emptyMood}>
          <View style={[styles.emptyMoodIcon, { backgroundColor: colors.surface.control }]}>
            <Icon name="chart-bar" size={28} color={colors.text.tertiary} />
          </View>
          <Text variant="h3" center>Track Your Flow</Text>
          <Text variant="bodySm" color="secondary" center>
            Log your first mood to see trends.
          </Text>
        </View>
      )}

      {/* Remark */}
      <View style={[styles.remark, { backgroundColor: colors.surface.default }]}>
        <Icon name="lightbulb" size={14} color={colors.accent.warning} />
        <Text variant="bodySm" color="secondary" style={styles.flex1}>
          {getMoodRemark(moodStats)}
        </Text>
      </View>
    </View>
  );
};

export default MoodSummary;

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  flex1: { flex: 1 },
  bold: { fontFamily: fonts.bold },
  eyebrow: { letterSpacing: 1, textTransform: "uppercase", marginBottom: spacing.xxs },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerErrorIcon: { marginRight: spacing.sm },
  moodList: {
    gap: spacing.lg,
  },
  moodRow: {
    gap: spacing.sm,
  },
  moodRowHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  moodLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  track: {
    height: 8,
    borderRadius: radius.full,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: radius.full,
  },
  emptyMood: {
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  emptyMoodIcon: {
    width: size.avatar,
    height: size.avatar,
    borderRadius: size.avatar / 2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  remark: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  skeletonHeaderText: { gap: spacing.sm },
});
