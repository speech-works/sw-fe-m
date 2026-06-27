import React from "react";
import { StyleSheet, View } from "react-native";
import Icon from "react-native-vector-icons/FontAwesome5";
import Angry1 from "../../../../../assets/mood-check/Angry1";
import Calm1 from "../../../../../assets/mood-check/Calm1";
import Happy1 from "../../../../../assets/mood-check/Happy1";
import Sad1 from "../../../../../assets/mood-check/Sad1";
import {
  useTheme,
  spacing,
  radius,
  size,
  Text,
  Skeleton,
} from "../../../../../design-system";
import { getMoodRemark } from "./helper";

const MOOD_FACES = {
  ANGRY: Angry1,
  CALM: Calm1,
  HAPPY: Happy1,
  SAD: Sad1,
};

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
      <View style={styles.moodGrid}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={[styles.moodCard, { backgroundColor: colors.surface.default }]}>
            <Skeleton width={48} height={48} radius={24} />
            <Skeleton width={40} height={10} />
            <Skeleton width={32} height={18} />
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

  const nonZeroMoods = (Object.entries(moodStats) as [string, number][]).filter(
    ([, percentage]) => percentage > 0,
  );

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

      {/* Mood tiles or empty */}
      {nonZeroMoods.length > 0 ? (
        <View style={styles.moodGrid}>
          {nonZeroMoods.map(([mood, percentage]) => {
            const MoodFace = MOOD_FACES[mood as keyof typeof MOOD_FACES];
            if (!MoodFace) return null;
            return (
              <View key={mood} style={[styles.moodCard, { backgroundColor: colors.surface.default }]}>
                <View style={[styles.moodFace, { backgroundColor: colors.surface.control }]}>
                  <MoodFace width={40} height={40} />
                </View>
                <Text variant="h3">{percentage.toFixed(1)}%</Text>
                <Text variant="caption" color="secondary">
                  {mood.charAt(0) + mood.slice(1).toLowerCase()}
                </Text>
              </View>
            );
          })}
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
    gap: spacing.xl,
  },
  flex1: { flex: 1 },
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
  moodGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  moodCard: {
    flex: 1,
    minWidth: 96,
    maxWidth: 130,
    borderRadius: radius.input,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    gap: spacing.sm,
  },
  moodFace: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
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
