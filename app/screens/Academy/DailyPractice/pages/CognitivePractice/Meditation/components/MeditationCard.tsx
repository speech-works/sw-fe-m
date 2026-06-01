import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Icon from "react-native-vector-icons/FontAwesome5";
import { CognitivePractice } from "../../../../../../../api/dailyPractice/types";
import { theme } from "../../../../../../../Theme/tokens";
import {
    parseShadowStyle,
    parseTextStyle,
} from "../../../../../../../util/functions/parseStyles";

interface MeditationCardProps {
  onMedToggle: () => void;
  selectedMed: CognitivePractice;
}

const MeditationCard = ({ onMedToggle, selectedMed }: MeditationCardProps) => {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={styles.container}
      onPress={onMedToggle}
      testID="meditation-change-card"
    >
      <View style={styles.innerCard}>
        <View style={styles.contentContainer}>
          {/* Chip */}
          <View style={styles.chip}>
            <Icon name="headphones" size={10} color={theme.colors.library.purple[500]} />
            <Text style={styles.chipText}>Voice Guided</Text>
          </View>

          <View style={styles.textContainer}>
            <Text style={styles.titleText}>{selectedMed?.name}</Text>
            <Text style={styles.descText} numberOfLines={2}>
              {selectedMed?.description}
            </Text>
          </View>

          <View style={styles.cardFooter}>
            <View style={styles.timeBadge}>
              <Icon name="clock" size={12} color="#6B7280" />
              <Text style={styles.footerText}>
                {selectedMed?.guidedMeditationData?.durationMinutes} mins
              </Text>
            </View>

            {/* Change Button */}
            <View style={styles.changeButton}>
              <Text style={styles.changeButtonText}>Change</Text>
              <Icon name="chevron-right" size={10} color={theme.colors.library.purple[500]} />
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default MeditationCard;

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    // Bento-style shadow & border
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E5E7EB",
  },
  innerCard: {
    borderRadius: 24,
    padding: 24,
  },
  contentContainer: {
    gap: 16,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3E8FF", // subtle purple bg
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
    gap: 6,
  },
  chipText: {
    color: theme.colors.library.purple[700],
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  textContainer: {
    gap: 4,
  },
  titleText: {
    ...parseTextStyle(theme.typography.Heading3),
    color: "#111827", // Gray-900
    fontSize: 22,
  },
  descText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: "#4B5563", // Gray-600
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  timeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  footerText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: "#6B7280", // Gray-500
    fontWeight: "600",
  },
  changeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F9FAFB", // Gray-50
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB", // Gray-200
  },
  changeButtonText: {
    color: theme.colors.library.purple[600],
    fontSize: 12,
    fontWeight: "700",
  },
});
