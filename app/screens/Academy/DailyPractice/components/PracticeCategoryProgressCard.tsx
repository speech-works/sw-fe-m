import React from "react";
import { StyleSheet, View } from "react-native";
import { PracticeCategorySummaryItem } from "../../../../api/practiceCategories/types";
import {
  Surface,
  Divider,
  Text,
  Icon,
  icons,
  useTheme,
  spacing,
  space,
  radius,
} from "../../../../design-system";
import { formatDuration } from "../../../../util/functions/time";

/** Vivid accent role — a key of `colors.accent` / `colors.accentOn` / `colors.accentTint`.
 *  Keeps each practice category visually distinct (Reading=info, Fun=success, …) while the
 *  card body stays on dark surface tokens. */
export type ProgressCardAccent =
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "purple"
  | "lime";

type PracticeCategoryProgressCardProps = {
  summary: PracticeCategorySummaryItem | null;
  title: string;
  subtitle: string;
  badgeLabel: string;
  /** Which vivid accent tints this card's icon discs + scope badge. */
  accent: ProgressCardAccent;
};

const formatMinutesCompact = (minutes: number) => {
  if (!minutes) {
    return "0m";
  }

  return formatDuration(minutes).split(" ")[0];
};

const getPrimarySubtitleLine = (subtitle: string) => {
  const firstSentence = subtitle.match(/^.*?[.!?](?:\s|$)/)?.[0]?.trim();
  return firstSentence || subtitle.trim();
};

const PracticeCategoryProgressCard = ({
  summary,
  title,
  subtitle,
  badgeLabel,
  accent,
}: PracticeCategoryProgressCardProps) => {
  const { colors } = useTheme();
  const accentColor = colors.accent[accent];
  const accentTint = colors.accentTint[accent];

  return (
    <Surface
      level="elevated"
      rounded="card"
      bordered
      style={styles.card}
    >
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text variant="h3" color="primary">
            {title}
          </Text>
          <Text variant="caption" color="secondary" style={styles.subtitle}>
            {getPrimarySubtitleLine(subtitle)}
          </Text>
        </View>
        {/* Scope badge — a soft accent-tinted chip so the category reads at a glance. */}
        <View style={[styles.statusBadge, { backgroundColor: accentTint }]}>
          <Text variant="caption" color={accentColor} style={styles.statusBadgeText}>
            {badgeLabel}
          </Text>
        </View>
      </View>

      <View style={styles.grid}>
        <View style={styles.statItem}>
          <View style={[styles.statIconWrapper, { backgroundColor: accentTint }]}>
            <Icon name={icons.success} size={18} color={accentColor} />
          </View>
          <View style={styles.statCopy}>
            <Text variant="h3" color="primary" style={styles.statValueBig}>
              {summary?.weekly.completedCount ?? 0}
            </Text>
            <Text variant="caption" color="tertiary">
              completed this week
            </Text>
          </View>
        </View>

        <View
          style={[styles.statDivider, { backgroundColor: colors.border.default }]}
        />

        <View style={styles.statItem}>
          <View style={[styles.statIconWrapper, { backgroundColor: accentTint }]}>
            <Icon name={icons.duration} size={18} color={accentColor} />
          </View>
          <View style={styles.statCopy}>
            <Text variant="h3" color="primary" style={styles.statValueBig}>
              {formatMinutesCompact(summary?.weekly.totalMinutes ?? 0)}
            </Text>
            <Text variant="caption" color="tertiary">
              practice time this week
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.footerDivider}>
        <Divider />
      </View>

      <View style={styles.footerRow}>
        <Text variant="caption" color="tertiary" style={styles.footerTitle}>
          Lifetime
        </Text>
        <Text variant="caption" color="secondary">
          {summary?.lifetime.completedCount ?? 0} completed •{" "}
          {formatMinutesCompact(summary?.lifetime.totalMinutes ?? 0)} total time
        </Text>
      </View>
    </Surface>
  );
};

export default PracticeCategoryProgressCard;

const styles = StyleSheet.create({
  card: {
    padding: spacing["2xl"],
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.md,
    marginBottom: spacing["2xl"],
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
    paddingRight: spacing.xs,
  },
  subtitle: {
    marginTop: space.titleSub,
  },
  statusBadge: {
    borderRadius: radius.chip,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xxs,
    flexShrink: 0,
    alignSelf: "flex-start",
  },
  statusBadgeText: {
    fontWeight: "700",
  },
  grid: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  statIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  statCopy: {
    flex: 1,
  },
  statValueBig: {
    lineHeight: 28,
  },
  statDivider: {
    width: 1,
    height: 32,
    marginHorizontal: spacing.sm,
  },
  footerDivider: {
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  footerRow: {
    gap: spacing.xs,
  },
  footerTitle: {
    textTransform: "uppercase",
    letterSpacing: 1,
    fontWeight: "700",
  },
});
