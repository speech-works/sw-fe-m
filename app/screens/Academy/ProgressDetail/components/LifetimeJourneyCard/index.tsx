import React from "react";
import { StyleSheet, View } from "react-native";
import { LifetimeJourneySummary } from "../../../../../api/progressReport/types";
import {
  useTheme,
  spacing,
  radius,
  borderWidth,
  size,
  Text,
  Icon,
  icons,
} from "../../../../../design-system";
import { insetSurface } from "../../insetSurface";

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

  /**
   * NOTHING RATHER THAN FOUR ZEROS.
   *
   * A brand-new account gets a perfectly successful response describing an
   * empty life: `0m / 0 / 0 / Level 1`, rendered at `h2`, under the heading
   * "LIFETIME JOURNEY". There was no branch for it — the only guards above are
   * for loading and for a missing payload, so somebody who had just signed up
   * was shown a large, confident summary of having done nothing.
   *
   * The card is withheld instead. The growth card immediately above already
   * carries the honest first-run state, with an invitation and what would move
   * each axis first, so this would only add a second and colder version of the
   * same news. It reappears the moment there is one real number in it.
   */
  const hasAnyHistory =
    journey.totalPracticeMinutes > 0 ||
    journey.totalCompletedPractices > 0 ||
    journey.totalPracticeDays > 0;
  if (!hasAnyHistory) return null;

  const stat = (value: string | number, label: string) => (
    <View
      style={[
        styles.statCard,
        // Same inset rule as every other card on this screen.
        insetSurface(colors),
      ]}
    >
      <Text variant="h2" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
        {value}
      </Text>
      <Text variant="eyebrow" color="secondary">
        {label}
      </Text>
    </View>
  );

  return (
    <View style={[styles.card, { backgroundColor: colors.surface.elevated }]}>
      <View style={styles.headerRow}>
        <View style={styles.flex1}>
          <Text variant="eyebrow" color="tertiary" style={styles.eyebrow}>
            LIFETIME JOURNEY
          </Text>
          <Text variant="h3">{journey.stageTitle}</Text>
        </View>
        <View style={styles.headerRight}>
          {hasError ? (
            <Icon name={icons.warning} size={size.iconInline} color={colors.feedback.dangerText} style={styles.headerErrorIcon} />
          ) : null}
          <Icon name={icons.journeyRoute} size={size.icon} color={colors.text.tertiary} />
        </View>
      </View>

      <View style={styles.statGrid}>
        {stat(formatMinutes(journey.totalPracticeMinutes), "Practice time")}
        {stat(journey.totalCompletedPractices, "Practices")}
        {stat(journey.totalPracticeDays, "Practice days")}
        {stat(`Level ${journey.level}`, "Level")}
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
  eyebrow: { marginBottom: spacing.xxs },
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
    borderWidth: borderWidth.hairline,
    width: "48%",
    flexGrow: 1,
    borderRadius: radius.card,
    padding: spacing.lg,
    minHeight: 92,
    justifyContent: "space-between",
    gap: spacing.sm,
  },
});
