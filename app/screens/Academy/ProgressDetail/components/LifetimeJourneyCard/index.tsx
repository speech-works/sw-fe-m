import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Icon from "react-native-vector-icons/FontAwesome5";
import { LifetimeJourneySummary } from "../../../../../api/progressReport/types";
import { theme } from "../../../../../Theme/tokens";
import { parseTextStyle } from "../../../../../util/functions/parseStyles";

type LifetimeJourneyCardProps = {
  journey: LifetimeJourneySummary | null;
  loading?: boolean;
  hasError?: boolean;
};

const formatMinutes = (minutes: number) => {
  if (minutes < 60) {
    return `${Math.round(minutes)}m`;
  }

  const hours = minutes / 60;
  if (hours < 10) {
    return `${hours.toFixed(1)}h`;
  }

  return `${Math.round(hours)}h`;
};

const LifetimeJourneyCard = ({
  journey,
  loading = false,
  hasError = false,
}: LifetimeJourneyCardProps) => {
  if (loading && !journey) {
    return null;
  }

  if (!journey) {
    return null;
  }

  return (
    <View style={styles.shadowContainer}>
      <LinearGradient
        colors={["#F97316", "#FB7185"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.bubbleTopRight} />
        <View style={styles.bubbleBottomLeft} />

        <View style={styles.contentLayer}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerLabel}>LIFETIME JOURNEY</Text>
              <Text style={styles.headerTitle}>{journey.stageTitle}</Text>
            </View>
            <View style={styles.headerIconBubble}>
              {hasError ? (
                <Icon
                  name="exclamation-circle"
                  size={14}
                  color="rgba(255,255,255,0.8)"
                  style={{ marginRight: 8 }}
                />
              ) : null}
              <Icon name="route" size={18} color="#FFF" />
            </View>
          </View>

          <View style={styles.statGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue} numberOfLines={1}>
                {formatMinutes(journey.totalPracticeMinutes)}
              </Text>
              <Text style={styles.statLabel} numberOfLines={1}>
                Practice time
              </Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue} numberOfLines={1}>
                {journey.totalCompletedPractices}
              </Text>
              <Text style={styles.statLabel} numberOfLines={1}>
                Practices
              </Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue} numberOfLines={1}>
                {journey.totalPracticeDays}
              </Text>
              <Text style={styles.statLabel} numberOfLines={1}>
                Practice days
              </Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
                L{journey.level} • {journey.totalXp} XP
              </Text>
              <Text style={styles.statLabel} numberOfLines={1}>
                Level • XP
              </Text>
            </View>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};

export default LifetimeJourneyCard;

const styles = StyleSheet.create({
  shadowContainer: {
    borderRadius: 24,
    shadowColor: "#F97316",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 8,
    backgroundColor: "#FFEDD5",
    overflow: "hidden",
  },
  gradient: {
    paddingHorizontal: 20,
    paddingVertical: 22,
    position: "relative",
  },
  bubbleTopRight: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    top: -80,
    right: -50,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  bubbleBottomLeft: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    left: -30,
    bottom: -40,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  contentLayer: {
    gap: 18,
    zIndex: 1,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  headerIconBubble: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.16)",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignSelf: "flex-start",
  },
  headerLabel: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: "rgba(255,255,255,0.9)",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  headerTitle: {
    ...parseTextStyle(theme.typography.Heading3),
    color: "#FFF",
    marginTop: 6,
  },
  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statCard: {
    width: "48%",
    backgroundColor: "rgba(255,255,255,0.16)",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    minHeight: 96,
    justifyContent: "space-between",
  },
  statValue: {
    ...parseTextStyle(theme.typography.Heading3),
    color: "#FFF",
    fontSize: 24,
  },
  statLabel: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: "rgba(255,255,255,0.78)",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontSize: 12,
  },
});
