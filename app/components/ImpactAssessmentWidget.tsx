import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
// import { theme } from "../Theme/tokens"; // REMOVED to fix circular dependency/crash
import Icon from "react-native-vector-icons/Feather";
import FaIcon from "react-native-vector-icons/FontAwesome5";
import TherapistFace from "../assets/sw-faces/TherapistFace";

interface Props {
  onPress: () => void;
  dayNumber?: number;
  totalDays?: number;
  totalRemaining?: number;
  style?: any;
}

const TOTAL_QUESTIONS = 100; // Structured impact assessment total

const ImpactAssessmentWidget: React.FC<Props> = ({
  onPress,
  totalRemaining = 100,
  style,
}) => {
  // Calculate progress based on questions answered
  const questionsAnswered = TOTAL_QUESTIONS - totalRemaining;
  const progressPercentage = Math.min(
    Math.max((questionsAnswered / TOTAL_QUESTIONS) * 100, 0),
    100,
  );

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity activeOpacity={0.9} onPress={onPress}>
        <LinearGradient
          // Orange/Warm Gradient for Practice
          colors={["#F97316", "#EA580C"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          {/* Decorative Bubbles */}
          <View style={styles.bubbleTopRight} />
          <View style={styles.bubbleBottomLeft} />

          {/* Watermark Image */}
          <View style={styles.faceContainer}>
            <TherapistFace size={160} shouldAnimate={true} transparentBg />
          </View>

          {/* Header Section */}
          <View style={styles.content}>
            <View style={styles.chip}>
              <Icon name="activity" size={12} color="white" />
              <Text style={styles.chipText}>Clinical Assessment</Text>
            </View>

            <View style={styles.textContainer}>
              <Text style={styles.title}>Unlock Your Profile</Text>
              <Text style={styles.subtitle}>
                {totalRemaining} question{totalRemaining !== 1 ? "s" : ""}{" "}
                remaining • Answer at your own pace.
              </Text>
            </View>

            {/* Progress Section */}
            <View style={styles.progressSection}>
              <View style={styles.progressLabels}>
                <Text style={styles.progressText}>Progress</Text>
                <Text style={styles.progressText}>
                  {Math.round(progressPercentage)}%
                </Text>
              </View>
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${progressPercentage}%` },
                  ]}
                />
              </View>
            </View>
          </View>

          {/* Action Button (Pill Style) */}
          <View style={styles.actionButton}>
            <FaIcon name="play" size={12} color="#EA580C" />
            <Text style={styles.actionText}>Continue Assessment</Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

export default React.memo(ImpactAssessmentWidget);

const styles = StyleSheet.create({
  container: {
    marginBottom: 0,
    borderRadius: 24,
    // Premium SaaS Shadow
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 10,
    overflow: "hidden",
  },
  gradient: {
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 24,
    height: 280,
    justifyContent: "space-between",
    position: "relative",
  },
  // Decorative Bubbles
  bubbleTopRight: {
    position: "absolute",
    top: -80,
    right: -80,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  bubbleBottomLeft: {
    position: "absolute",
    bottom: -60,
    left: -60,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  faceContainer: {
    position: "absolute",
    right: -10,
    bottom: -10, // Moved up so it's not clipped/cramped at the bottom
    zIndex: 0, // Behind content
    opacity: 0.6, // More subtle watermark look
  },
  content: {
    gap: 16,
    zIndex: 1,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: "flex-start",
    gap: 6,
  },
  chipText: {
    color: "white",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  textContainer: {
    gap: 4,
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "900",
    color: "white",
    letterSpacing: -0.6,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "500",
    color: "rgba(255, 255, 255, 0.85)",
    maxWidth: "90%",
  },
  progressSection: {
    marginTop: 8,
  },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  progressText: {
    color: "rgba(255, 255, 255, 0.95)",
    fontSize: 13,
    fontWeight: "700",
  },
  progressBarBg: {
    height: 6,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "white",
    borderRadius: 4,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    alignSelf: "flex-start",
    gap: 8,
    zIndex: 2,
    marginTop: 4, // Tighter margin
    shadowColor: "rgba(0, 0, 0, 0.1)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
  actionText: {
    fontSize: 14,
    color: "#EA580C",
    fontWeight: "900",
    letterSpacing: 0.5,
  },
});
