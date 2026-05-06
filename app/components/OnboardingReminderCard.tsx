import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Icon from "react-native-vector-icons/Feather";
import FaIcon from "react-native-vector-icons/FontAwesome5";
import { theme } from "../Theme/tokens";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../util/functions/parseStyles";

import FinishLineFace from "../assets/mood-check/FinishLineFace";

interface Props {
  onPress: () => void;
  currentStep: number;
  totalSteps: number;
  style?: any;
}

const OnboardingReminderCard: React.FC<Props> = ({
  onPress,
  currentStep,
  totalSteps,
  style,
}) => {
  // Ensure we don't divide by zero if totalSteps is somehow 0
  const safeTotal = totalSteps > 0 ? totalSteps : 1;
  // Ensure current step doesn't visually exceed total (e.g. if on the "Done" screen)
  const safeCurrent = Math.min(currentStep + 1, safeTotal); // +1 because currentStep is 0-indexed usually

  // Calculate percentage between 0 and 100 for the width width
  const progressPercentage = Math.min(
    Math.max((safeCurrent / safeTotal) * 100, 0),
    100,
  );

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity activeOpacity={0.9} onPress={onPress}>
        <LinearGradient
          // Cyan/Blue Gradient
          colors={["#22D3EE", "#0EA5E9"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          {/* Decorative Bubbles */}
          <View style={styles.bubbleTopRight} />
          <View style={styles.bubbleBottomLeft} />

          {/* Watermark Image - Restored Face */}
          <View style={styles.faceContainer}>
            <FinishLineFace size={160} transparentBg shouldAnimate />
          </View>

          {/* Header Section */}
          <View style={styles.content}>
            <View style={styles.chip}>
              <Icon name="zap" size={12} color="white" />
              <Text style={styles.chipText}>Setup Required</Text>
            </View>

            <View style={styles.textContainer}>
              <Text style={styles.title}>Complete Profile</Text>
              <Text style={styles.subtitle}>
                Finish setting up to get your personalized plan
              </Text>
            </View>

            {/* Progress Section */}
            <View style={styles.progressSection}>
              <View style={styles.progressLabels}>
                <Text style={styles.progressText}>
                  Step {safeCurrent} of {safeTotal}
                </Text>
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
            <FaIcon name="play" size={12} color="#0284C7" />
            <Text style={styles.actionText}>Continue Setup</Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

export default React.memo(OnboardingReminderCard);

const styles = StyleSheet.create({
  container: {
    marginBottom: 0,
    borderRadius: 40,
    // Premium SaaS Shadow
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 10,
    overflow: "hidden",
  },
  gradient: {
    borderRadius: 40,
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
    maxWidth: "85%",
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
    marginTop: 4, // Reduced margin to let space-between work
    shadowColor: "rgba(0, 0, 0, 0.1)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
  actionText: {
    fontSize: 14,
    color: "#0284C7",
    fontWeight: "900",
    letterSpacing: 0.5,
  },
});
