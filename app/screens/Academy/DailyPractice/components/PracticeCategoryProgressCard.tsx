import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Icon from "react-native-vector-icons/FontAwesome5";
import { PracticeCategorySummaryItem } from "../../../../api/practiceCategories/types";
import { theme } from "../../../../Theme/tokens";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../../util/functions/parseStyles";
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
  return (
    <View style={styles.statsSection}>
      <LinearGradient colors={accent.gradient} style={styles.statsDashboard}>
        <View style={styles.dashboardHeader}>
          <View style={styles.headerCopy}>
            <Text style={styles.dashboardTitle}>{title}</Text>
            <Text style={styles.dashboardSubtitle}>
              {getPrimarySubtitleLine(subtitle)}
            </Text>
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

        <View style={styles.dashboardGrid}>
          <View style={styles.statItem}>
            <View
              style={[styles.statIconWrapper, { backgroundColor: accent.iconBg }]}
            >
              <Icon name="check-double" size={18} color={accent.iconColor} />
            </View>
            <View style={styles.statCopy}>
              <Text style={styles.statValueBig}>
                {summary?.weekly.completedCount ?? 0}
              </Text>
              <Text style={styles.statLabelSmall}>completed this week</Text>
            </View>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <View
              style={[styles.statIconWrapper, { backgroundColor: accent.iconBg }]}
            >
              <Icon
                name="hourglass-half"
                size={18}
                color={accent.iconColor}
              />
            </View>
            <View style={styles.statCopy}>
              <Text style={styles.statValueBig}>
                {formatMinutesCompact(summary?.weekly.totalMinutes ?? 0)}
              </Text>
              <Text style={styles.statLabelSmall}>practice time this week</Text>
            </View>
          </View>
        </View>

        <View style={styles.footerRow}>
          <Text style={styles.footerTitle}>Lifetime</Text>
          <Text style={styles.footerText}>
            {summary?.lifetime.completedCount ?? 0} completed •{" "}
            {formatMinutesCompact(summary?.lifetime.totalMinutes ?? 0)} total
            time
          </Text>
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
    padding: 24,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    ...parseShadowStyle(theme.shadow.elevation1),
  },
  dashboardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 24,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
    paddingRight: 4,
  },
  dashboardTitle: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
    fontSize: 20,
  },
  dashboardSubtitle: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
    marginTop: 4,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    flexShrink: 0,
    alignSelf: "flex-start",
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  dashboardGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  statCopy: {
    flex: 1,
  },
  statValueBig: {
    fontFamily: "Outfit-Bold",
    fontSize: 24,
    fontWeight: "700",
    color: theme.colors.text.title,
    lineHeight: 28,
  },
  statLabelSmall: {
    fontSize: 10,
    color: theme.colors.text.disabled,
    fontWeight: "500",
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: theme.colors.library.gray[300],
    marginHorizontal: 8,
  },
  footerRow: {
    marginTop: 18,
    gap: 6,
  },
  footerTitle: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
    textTransform: "uppercase",
    letterSpacing: 1,
    fontWeight: "700",
  },
  footerText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
  },
});
