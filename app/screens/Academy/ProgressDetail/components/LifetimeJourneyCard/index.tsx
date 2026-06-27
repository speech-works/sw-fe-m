import React from "react";
import { StyleSheet, View } from "react-native";
import Icon from "react-native-vector-icons/FontAwesome5";
import { LifetimeJourneySummary } from "../../../../../api/progressReport/types";
import {
  useTheme,
  spacing,
  radius,
  size,
  Text,
} from "../../../../../design-system";

type LifetimeJourneyCardProps = {
  journey: LifetimeJourneySummary | null;
  loading?: boolean;
  hasError?: boolean;
};

const formatMinutes = (minutes: number) => {
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hours = minutes / 60;
  if (hours < 10) return `${hours.toFixed(1)}h`;
  return `${Math.round(hours)}h`;
};

const LifetimeJourneyCard = ({
  journey,
  loading = false,
  hasError = false,
}: LifetimeJourneyCardProps) => {
  const { colors } = useTheme();

  if ((loading && !journey) || !journey) {
    return null;
  }

  const stat = (value: string | number, label: string) => (
    <View style={[styles.statCard, { backgroundColor: colors.surface.default }]}>
      <Text variant="h2" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
        {value}
      </Text>
      <Text variant="caption" color="secondary" style={styles.statLabel}>
        {label}
      </Text>
    </View>
  );

  return (
    <View style={[styles.card, { backgroundColor: colors.surface.elevated }]}>
      <View style={styles.headerRow}>
        <View style={styles.flex1}>
          <Text variant="label" color="tertiary" style={styles.eyebrow}>
            LIFETIME JOURNEY
          </Text>
          <Text variant="h3">{journey.stageTitle}</Text>
        </View>
        <View style={styles.headerRight}>
          {hasError ? (
            <Icon name="exclamation-circle" size={14} color={colors.feedback.dangerText} style={styles.headerErrorIcon} />
          ) : null}
          <Icon name="route" size={size.icon} color={colors.text.tertiary} />
        </View>
      </View>

      <View style={styles.statGrid}>
        {stat(formatMinutes(journey.totalPracticeMinutes), "Practice time")}
        {stat(journey.totalCompletedPractices, "Practices")}
        {stat(journey.totalPracticeDays, "Practice days")}
        {stat(`L${journey.level} • ${journey.totalXp} XP`, "Level • XP")}
      </View>
    </View>
  );
};

export default LifetimeJourneyCard;

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    padding: spacing["2xl"],
    gap: spacing["2xl"],
  },
  flex1: { flex: 1 },
  eyebrow: { letterSpacing: 1, textTransform: "uppercase", marginBottom: spacing.xxs },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerErrorIcon: { marginRight: spacing.sm },
  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  statCard: {
    width: "48%",
    flexGrow: 1,
    borderRadius: radius.input,
    padding: spacing.lg,
    minHeight: 92,
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  statLabel: {
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
});
