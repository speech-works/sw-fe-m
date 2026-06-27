import React from "react";
import { StyleSheet, View } from "react-native";
import Icon from "react-native-vector-icons/FontAwesome5";
import {
  useTheme,
  spacing,
  radius,
  size,
  Text,
  Skeleton,
} from "../../../../../design-system";
import { getMoodRemark } from "./helper";

const SEGMENTS = 8;
const MOOD_ORDER = ["HAPPY", "CALM", "SAD", "ANGRY"] as const;

/** Mood → semantic accent (happy=warm, calm=green, sad=blue, angry=red). */
const MOOD_COLOR = {
  HAPPY: "warning",
  CALM: "success",
  SAD: "info",
  ANGRY: "danger",
} as const;

const moodName = (mood: string) => mood.charAt(0) + mood.slice(1).toLowerCase();

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
      <View style={styles.gaugeRow}>
        {MOOD_ORDER.map((m) => (
          <View key={m} style={styles.gaugeCol}>
            <Skeleton width={28} height={20} />
            <Skeleton width={38} height={GAUGE_HEIGHT} radius={radius.chip} />
            <Skeleton width={44} height={12} />
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

  const total = Object.values(moodStats).reduce((sum, v) => sum + v, 0);

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

      {total > 0 ? (
        <View style={styles.gaugeRow}>
          {MOOD_ORDER.map((mood) => {
            const pct = moodStats[mood] ?? 0;
            const filled = pct > 0 ? Math.max(1, Math.round((pct / 100) * SEGMENTS)) : 0;
            const tint = moodColor(mood);
            return (
              <View key={mood} style={styles.gaugeCol}>
                <Text variant="h2" color={pct > 0 ? "primary" : "tertiary"}>
                  {String(Math.round(pct)).padStart(2, "0")}
                </Text>
                <View style={styles.gauge}>
                  {Array.from({ length: SEGMENTS }).map((_, i) => {
                    const fromBottom = SEGMENTS - 1 - i; // 0 = bottom-most
                    const isFilled = fromBottom < filled;
                    const ratio = filled > 1 ? fromBottom / (filled - 1) : 0;
                    return (
                      <View
                        key={i}
                        style={[
                          styles.segment,
                          {
                            backgroundColor: isFilled ? tint : colors.surface.control,
                            opacity: isFilled ? 1 - ratio * 0.5 : 1,
                          },
                        ]}
                      />
                    );
                  })}
                </View>
                <Text variant="caption" color={pct > 0 ? "secondary" : "tertiary"}>
                  {moodName(mood)}
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

const GAUGE_HEIGHT = 132;

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
  gaugeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  gaugeCol: {
    flex: 1,
    alignItems: "center",
    gap: spacing.sm,
  },
  gauge: {
    width: 38,
    height: GAUGE_HEIGHT,
    flexDirection: "column",
    gap: spacing.xs,
  },
  segment: {
    flex: 1,
    width: "100%",
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
