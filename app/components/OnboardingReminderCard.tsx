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
    borderRadius: 24,
    shadowColor: "#0EA5E9",
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
    right: -20,
    bottom: -25,
    zIndex: 1,
    //opacity: 0.15,
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
    ...parseTextStyle(theme.typography.Heading2),
    color: "white",
    fontSize: 24,
  },
  subtitle: {
    ...parseTextStyle(theme.typography.Body),
    color: "rgba(255, 255, 255, 0.9)",
    maxWidth: "65%",
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
    ...parseShadowStyle(theme.shadow.elevation1),
  },
  actionText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: "#0284C7", // Sky 600
    fontWeight: "700",
  },
});
