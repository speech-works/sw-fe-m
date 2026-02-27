import { LinearGradient } from "expo-linear-gradient";
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
      <LinearGradient
        colors={["#7C3AED", "#6D28D9"]} // Violet-600 to Violet-700
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Decorative Bubbles */}
        <View style={styles.bubbleTopRight} />
        <View style={styles.bubbleBottomLeft} />

        {/* Watermark */}
        <View style={styles.watermarkContainer}>
          <Icon name="spa" size={120} color="#FFF" style={{ opacity: 0.1 }} />
        </View>

        <View style={styles.contentContainer}>
          {/* Chip */}
          <View style={styles.chip}>
            <Icon name="headphones" size={10} color="#FFF" />
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
              <Icon name="clock" size={12} color="rgba(255,255,255,0.8)" />
              <Text style={styles.footerText}>
                {selectedMed?.guidedMeditationData?.durationMinutes} mins
              </Text>
            </View>

            {/* Change Button */}
            <View style={styles.glassButton}>
              <Text style={styles.glassButtonText}>Change</Text>
              <Icon name="chevron-right" size={10} color="#FFF" />
            </View>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

export default MeditationCard;

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    ...parseShadowStyle(theme.shadow.elevation2),
    backgroundColor: "#fff",
  },
  gradient: {
    borderRadius: 24,
    padding: 24,
    position: "relative",
    overflow: "hidden",
  },
  // Decorative
  bubbleTopRight: {
    position: "absolute",
    top: -50,
    right: -50,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  bubbleBottomLeft: {
    position: "absolute",
    bottom: -30,
    left: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  watermarkContainer: {
    position: "absolute",
    right: -20,
    bottom: -20,
    transform: [{ rotate: "-15deg" }],
  },
  contentContainer: {
    gap: 16,
    zIndex: 2,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
    gap: 6,
  },
  chipText: {
    color: "#FFF",
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
    color: "#FFF",
    fontSize: 22,
  },
  descText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: "rgba(255, 255, 255, 0.8)",
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
    color: "rgba(255, 255, 255, 0.9)",
    fontWeight: "600",
  },
  glassButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  glassButtonText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "700",
  },
});
