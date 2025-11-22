import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../util/functions/parseStyles";
import { theme } from "../Theme/tokens";

import Happy1 from "../assets/mood-check/Happy1";
import HappyCustom from "../assets/mood-check/HappyFace";
import AngryCustom from "../assets/mood-check/AngryFace";
import SadCustom from "../assets/mood-check/SadFace";
import CalmCustom from "../assets/mood-check/CalmFace";
import CustomExcited from "../assets/mood-check/CuriousFace";
import CustomCrying from "../assets/mood-check/CustomCrying";

interface Props {
  onPress: () => void;
  currentStep: number; // <-- New Prop
  totalSteps: number; // <-- New Prop
}

const OnboardingReminderCard: React.FC<Props> = ({
  onPress,
  currentStep,
  totalSteps,
}) => {
  // Ensure we don't divide by zero if totalSteps is somehow 0
  const safeTotal = totalSteps > 0 ? totalSteps : 1;
  // Ensure current step doesn't visually exceed total (e.g. if on the "Done" screen)
  const safeCurrent = Math.min(currentStep, safeTotal);

  // Calculate percentage between 0 and 100 for the width width
  const progressPercentage = Math.min(
    Math.max((safeCurrent / safeTotal) * 100, 0),
    100
  );

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress}>
      <LinearGradient
        colors={["#F97316", "#EC4899"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.card}
      >
        <View style={styles.contentRow}>
          <View style={styles.textColumn}>
            <Text style={styles.descText}>ONBOARDING PROGRAM</Text>
            <Text style={styles.titleText}>Complete Your Onboarding</Text>

            <View style={styles.progressContainer}>
              <View style={styles.progressBarBg}>
                {/* DYNAMIC WIDTH BASED ON PROGRESS */}
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${progressPercentage}%` },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                {/* Use safeCurrent and safeTotal here. Changed "days" to "steps" */}
                {safeCurrent}/{safeTotal} steps
              </Text>
            </View>
          </View>

          <CustomCrying size={116} />
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

export default OnboardingReminderCard;

const styles = StyleSheet.create({
  card: {
    marginBottom: 20,
    backgroundColor: "#F97316", // Fallback
    borderRadius: 16,
    ...parseShadowStyle(theme.shadow.elevation1),
    padding: 20,
    overflow: "hidden", // Ensure image doesn't bleed out
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  textColumn: {
    flex: 1,
    paddingRight: 16,
  },
  imageContainer: {
    width: 120,
    height: 120,
    justifyContent: "flex-end",
    alignItems: "center",
  },
  descText: {
    color: "rgba(255, 255, 255, 0.8)",
    ...parseTextStyle(theme.typography.BodySmall),
    fontWeight: "600",
    letterSpacing: 1,
    marginBottom: 4,
  },
  titleText: {
    color: "#fff",
    ...parseTextStyle(theme.typography.Heading3),
    marginBottom: 16,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  progressBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 3,
    marginRight: 12,
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#fff",
    borderRadius: 3,
  },
  progressText: {
    color: "#fff",
    ...parseTextStyle(theme.typography.BodySmall),
    fontWeight: "600",
  },
});
