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

const TOTAL_QUESTIONS = 100; // OASES assessment total

const OASESWidget: React.FC<Props> = ({
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

export default OASESWidget;

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
    borderRadius: 24,
    shadowColor: "#EA580C",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
    overflow: "hidden",
  },
  gradient: {
    borderRadius: 24,
    padding: 24,
    height: 260,
    justifyContent: "space-between",
    position: "relative",
  },
  // Decorative Bubbles
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
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  faceContainer: {
    position: "absolute",
    right: 0,
    bottom: -30,
    zIndex: 1,
    opacity: 0.2,
  },
  content: {
    gap: 12,
    zIndex: 1,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: "flex-start",
    gap: 6,
  },
  chipText: {
    color: "white",
    fontSize: 12,
    fontWeight: "700",
  },
  textContainer: {
    gap: 4,
  },
  title: {
    // Hardcoded Heading2
    fontFamily: "Inter_600SemiBold",
    fontSize: 24,
    lineHeight: 32,
    fontWeight: "600",
    color: "white",
  },
  subtitle: {
    // Hardcoded BodySmall
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400",
    color: "rgba(255, 255, 255, 0.9)",
    maxWidth: "90%",
  },
  progressSection: {
    marginTop: 8,
  },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  progressText: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 12,
    fontWeight: "600",
  },
  progressBarBg: {
    height: 6,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "white",
    borderRadius: 3,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: "flex-start",
    gap: 6,
    zIndex: 2,
    marginTop: 16,
    shadowColor: "rgba(0, 0, 0, 0.1)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 5,
    elevation: 2,
  },
  actionText: {
    // Hardcoded BodySmall
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 20,
    color: "#EA580C", // Orange 600
    fontWeight: "700",
  },
});
