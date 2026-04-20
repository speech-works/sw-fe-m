import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Icon from "react-native-vector-icons/FontAwesome5";
import { PracticeCategorySummaryItem } from "../../../../api/practiceCategories/types";
import { theme } from "../../../../Theme/tokens";
import { parseTextStyle } from "../../../../util/functions/parseStyles";
import { formatDuration } from "../../../../util/functions/time";

type PracticeCategoryProgressCardProps = {
  summary: PracticeCategorySummaryItem | null;
  title: string;
  subtitle: string;
  badgeLabel: string;
  accent: {
    gradient: readonly [string, string];
    iconBg: string;
    iconColor: string;
    badgeBg: string;
    badgeBorder: string;
    badgeText: string;
  };
};

const formatMinutesCompact = (minutes: number) => {
  if (!minutes) {
    return "0m";
  }

  return formatDuration(minutes).split(" ")[0];
};

const PracticeCategoryProgressCard = ({
  summary,
  title,
  subtitle,
  badgeLabel,
  accent,
}: PracticeCategoryProgressCardProps) => {
  return (
    <View style={styles.statsSection}>
      <LinearGradient colors={accent.gradient} style={styles.statsDashboard}>
        <View style={styles.dashboardHeader}>
          <View>
            <Text style={styles.dashboardTitle}>{title}</Text>
            <Text style={styles.dashboardSubtitle}>{subtitle}</Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: accent.badgeBg,
                borderColor: accent.badgeBorder,
              },
            ]}
          >
            <Text style={[styles.statusBadgeText, { color: accent.badgeText }]}>
              {badgeLabel}
            </Text>
          </View>
        </View>

        <View style={styles.primaryPanel}>
          <View style={[styles.iconBubble, { backgroundColor: accent.iconBg }]}>
            <Icon name="calendar-week" size={18} color={accent.iconColor} />
          </View>
          <View style={styles.primaryContent}>
            <Text style={styles.primaryEyebrow}>This week</Text>
            <View style={styles.primaryRow}>
              <View style={styles.primaryMetric}>
                <Text style={styles.primaryValue}>
                  {summary?.weekly.completedCount ?? 0}
                </Text>
                <Text style={styles.primaryLabel}>completed</Text>
              </View>
              <View style={styles.primaryDivider} />
              <View style={styles.primaryMetric}>
                <Text style={styles.primaryValue}>
                  {formatMinutesCompact(summary?.weekly.totalMinutes ?? 0)}
                </Text>
                <Text style={styles.primaryLabel}>practice time</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.lifetimeRow}>
          <Text style={styles.lifetimeTitle}>Lifetime</Text>
          <View style={styles.lifetimeStats}>
            <Text style={styles.lifetimeText}>
              {summary?.lifetime.completedCount ?? 0} total completed
            </Text>
            <Text style={styles.lifetimeDot}>•</Text>
            <Text style={styles.lifetimeText}>
              {formatMinutesCompact(summary?.lifetime.totalMinutes ?? 0)} total time
            </Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};

export default PracticeCategoryProgressCard;

const styles = StyleSheet.create({
  statsSection: {
    marginTop: 8,
  },
  statsDashboard: {
    borderRadius: 24,
    padding: 20,
    gap: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
  },
  dashboardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  dashboardTitle: {
    ...parseTextStyle(theme.typography.Heading4),
    color: theme.colors.text.title,
  },
  dashboardSubtitle: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
    marginTop: 4,
  },
  statusBadge: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: "flex-start",
  },
  statusBadgeText: {
    ...parseTextStyle(theme.typography.BodySmall),
    fontWeight: "700",
  },
  primaryPanel: {
    backgroundColor: "rgba(255,255,255,0.75)",
    borderRadius: 20,
    padding: 16,
    flexDirection: "row",
    gap: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.7)",
  },
  iconBubble: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryContent: {
    flex: 1,
    gap: 10,
  },
  primaryEyebrow: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
    textTransform: "uppercase",
    letterSpacing: 1,
    fontWeight: "700",
  },
  primaryRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  primaryMetric: {
    flex: 1,
  },
  primaryValue: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
  },
  primaryLabel: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
    marginTop: 4,
  },
  primaryDivider: {
    width: 1,
    alignSelf: "stretch",
    backgroundColor: "rgba(15,23,42,0.08)",
    marginHorizontal: 12,
  },
  lifetimeRow: {
    gap: 8,
  },
  lifetimeTitle: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
    textTransform: "uppercase",
    letterSpacing: 1,
    fontWeight: "700",
  },
  lifetimeStats: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
  },
  lifetimeText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
  },
  lifetimeDot: {
    color: theme.colors.text.default,
    opacity: 0.5,
  },
});
