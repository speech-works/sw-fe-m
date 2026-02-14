import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Alert,
} from "react-native";
import React, { useState, useEffect } from "react";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import Icon from "react-native-vector-icons/FontAwesome5";
import ScreenView from "../../../../../components/ScreenView";
import ConfettiAnimation from "../../../../../components/ConfettiAnimation";
import Button from "../../../../../components/Button";
import { theme } from "../../../../../Theme/tokens";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../../../util/functions/parseStyles";
import { AcademyStackParamList } from "../../../../../navigators/stacks/AcademyStack/types";
import { RealLifeChallengeData } from "../../../../../api/dailyPractice/types";
import { TactileTouchableOpacity } from "../../../../../components/TactileTouchableOpacity";
import {
  createPracticeActivity,
  startPracticeActivity,
  completePracticeActivity,
} from "../../../../../api/practiceActivities";
import { PracticeActivityContentType } from "../../../../../api/practiceActivities/types";
import { useSessionStore } from "../../../../../stores/session";
import { useActivityStore } from "../../../../../stores/activity";

enum ChallengeStep {
  START = 0,
  INSTRUCTION = 1,
  REFLECTION = 2,
  SUMMARY = 3,
}

type RealLifeChallengeParams = {
  guidedActivity?: any; // We can improve this type if we import GuidedActivity
  packContext?: { packId: string; moduleId: string };
};

const RealLifeChallenge = () => {
  const navigation = useNavigation();
  const route =
    useRoute<RouteProp<AcademyStackParamList, "RealLifeChallenge">>();
  const params = route.params as RealLifeChallengeParams;
  const { guidedActivity, packContext } = params || {};

  const { practiceSession } = useSessionStore();
  const { addActivity, updateActivity, doesActivityExist } = useActivityStore();
  const [currentActivityId, setCurrentActivityId] = useState<string | null>(
    null,
  );

  // Extract data based on where it's stored (Cognitive or Exposure)
  const challengeData: RealLifeChallengeData | undefined =
    guidedActivity?.cognitivePractice?.realLifeChallengeData ||
    guidedActivity?.exposurePractice?.realLifeChallengeData;

  const [currentStep, setCurrentStep] = useState<ChallengeStep>(
    ChallengeStep.START,
  );
  const [reflectionText, setReflectionText] = useState("");

  if (!challengeData) {
    return (
      <View style={styles.contentContainerCentered}>
        <Text>Error: Missing challenge data.</Text>
        <Button text="Go Back" onPress={() => navigation.goBack()} />
      </View>
    );
  }

  // Derive completion prompt based on data type
  const completionPrompt =
    "completionCriteria" in challengeData
      ? challengeData.completionCriteria
      : "Reflect on your experience and how it made you feel.";

  // title and description fallback
  const title =
    guidedActivity.cognitivePractice?.name ||
    guidedActivity.exposurePractice?.name ||
    "Real Life Challenge";
  const description =
    guidedActivity.cognitivePractice?.description ||
    guidedActivity.exposurePractice?.description ||
    "Complete this real-world task.";

  // --- Handlers ---

  const markActivityStart = async () => {
    // If we're in a pack, we might not have a global practiceSession, which is fine.
    // However, if we are NOT in a pack, we absolutely need one.
    if (!packContext && !practiceSession) return;

    try {
      const sessionId = packContext ? "pack-session" : practiceSession!.id;
      const userId = packContext ? "user" : practiceSession!.user.id;

      const contentId =
        guidedActivity?.cognitivePractice?.id ||
        guidedActivity?.exposurePractice?.id;

      if (!contentId) {
        console.error("Missing contentId for RealLifeChallenge");
        return;
      }

      const contentType = guidedActivity?.cognitivePractice
        ? PracticeActivityContentType.COGNITIVE_PRACTICE
        : PracticeActivityContentType.EXPOSURE_PRACTICE;

      const newActivity = await createPracticeActivity({
        sessionId,
        contentType,
        contentId,
        packId: packContext?.packId,
        moduleId: packContext?.moduleId,
      });

      const startedActivity = await startPracticeActivity({
        id: newActivity.id,
        userId: userId,
      });

      addActivity({
        ...startedActivity,
      });
      setCurrentActivityId(newActivity.id);
    } catch (err) {
      console.error("Failed to start activity", err);
    }
  };

  const markActivityComplete = async () => {
    if (!currentActivityId) return;
    try {
      // If we are in a pack, we rely on the backend handling the "pack-session" logic or similar
      // inside completePracticeActivity if needed, but usually completePracticeActivity just needs ID and UserID.
      const userId = packContext ? "user" : practiceSession!.user.id;

      const completedActivity = await completePracticeActivity({
        id: currentActivityId,
        userId: userId,
        packId: packContext?.packId,
        moduleId: packContext?.moduleId,
      });

      updateActivity(currentActivityId, {
        ...completedActivity,
      });
    } catch (err) {
      console.error("Failed to complete activity", err);
    }
  };

  const handleStart = async () => {
    await markActivityStart();
    setCurrentStep(ChallengeStep.INSTRUCTION);
  };

  const handleInstructionsComplete = () => {
    setCurrentStep(ChallengeStep.REFLECTION);
  };

  const handleReflectionComplete = async () => {
    // Here you would typically save the reflection to the backend
    console.log("Saving reflection:", reflectionText);
    await markActivityComplete();
    setCurrentStep(ChallengeStep.SUMMARY);
  };

  const handleDone = () => {
    // If pack context exists, use standard pack navigation
    if (packContext && guidedActivity) {
      // Logic handled by wrapping parent usually, but here we can try to go back
      navigation.goBack();
    } else {
      navigation.goBack();
    }
  };

  const handleBack = () => {
    if (currentStep === ChallengeStep.START) {
      navigation.goBack();
    } else {
      setCurrentStep(currentStep - 1);
    }
  };

  // --- Render Steps ---

  const renderHeader = () => (
    <View style={styles.header}>
      <TactileTouchableOpacity
        onPress={handleBack}
        style={styles.backButton}
        activeOpacity={0.7}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Icon name="chevron-left" size={16} color={theme.colors.text.title} />
      </TactileTouchableOpacity>
      <Text style={styles.headerTitle}>Real Life Challenge</Text>
      <View style={{ width: 32 }} />
    </View>
  );

  const renderStartScreen = () => (
    <View style={styles.contentContainer}>
      <View style={styles.heroSection}>
        <View style={styles.iconCircle}>
          <LinearGradient
            colors={["#FFF7ED", "#FFEDD5"]}
            style={StyleSheet.absoluteFill}
          />
          <Icon
            name="mountain"
            size={48}
            color={theme.colors.library.orange[600]}
          />
        </View>
        <Text style={styles.titleText}>{title}</Text>
        <Text style={styles.subtitleText}>{description}</Text>
      </View>

      <View style={styles.cardContainer}>
        <LinearGradient colors={["#FFFFFF", "#FFF7ED"]} style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoIconBg}>
              <Icon
                name="clock"
                size={14}
                color={theme.colors.library.orange[600]}
              />
            </View>
            <Text style={styles.infoText}>
              {challengeData.durationMinutes
                ? `${challengeData.durationMinutes} min activity`
                : "Self-paced"}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <View style={styles.infoIconBg}>
              <Icon
                name="star"
                size={14}
                color={theme.colors.library.orange[600]}
              />
            </View>
            <Text style={styles.infoText}>
              +{challengeData.xpReward || 50} XP Reward
            </Text>
          </View>
        </LinearGradient>
      </View>

      <View style={styles.footer}>
        <TactileTouchableOpacity
          style={styles.primaryButton}
          onPress={handleStart}
          activeOpacity={0.9}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
        >
          <LinearGradient
            colors={[
              theme.colors.library.orange[400],
              theme.colors.library.orange[500],
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.buttonGradient}
          >
            <Icon name="play" size={16} color="#FFF" />
            <Text style={styles.primaryButtonText}>Start Practice</Text>
          </LinearGradient>
        </TactileTouchableOpacity>
      </View>
    </View>
  );

  const renderInstructionScreen = () => (
    <View style={styles.contentContainer}>
      <Text style={styles.stepHeader}>Instructions</Text>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.instructionCard}>
          <LinearGradient
            colors={["#FFFFFF", "#FAFAFA"]}
            style={styles.cardGradient}
          >
            <Text style={styles.instructionText}>
              {challengeData.instructions}
            </Text>
          </LinearGradient>
        </View>

        {challengeData.encouragement && (
          <View style={styles.encouragementContainer}>
            <View style={styles.tipIcon}>
              <Icon
                name="lightbulb"
                size={16}
                color={theme.colors.library.orange[600]}
              />
            </View>
            <Text style={styles.encouragementText}>
              {challengeData.encouragement}
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TactileTouchableOpacity
          style={styles.primaryButton}
          onPress={handleInstructionsComplete}
          activeOpacity={0.9}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <LinearGradient
            colors={[
              theme.colors.library.orange[400],
              theme.colors.library.orange[500],
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.buttonGradient}
          >
            <Text style={styles.primaryButtonText}>
              I've Completed This Step
            </Text>
          </LinearGradient>
        </TactileTouchableOpacity>
      </View>
    </View>
  );

  const renderReflectionScreen = () => (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <View style={styles.contentContainer}>
        <Text style={styles.stepHeader}>Reflection</Text>
        <Text style={styles.stepSubHeader}>{completionPrompt}</Text>

        <TextInput
          style={styles.textArea}
          placeholder={challengeData.completionPlaceholder}
          placeholderTextColor={theme.colors.text.disabled}
          multiline
          value={reflectionText}
          onChangeText={setReflectionText}
          textAlignVertical="top"
        />

        <View style={styles.footer}>
          <TactileTouchableOpacity
            style={[
              styles.primaryButton,
              !reflectionText.trim() && styles.buttonDisabled,
            ]}
            onPress={handleReflectionComplete}
            disabled={!reflectionText.trim()}
            activeOpacity={0.9}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <LinearGradient
              colors={
                !reflectionText.trim()
                  ? ["#E2E8F0", "#CBD5E1"]
                  : [
                      theme.colors.library.orange[400],
                      theme.colors.library.orange[500],
                    ]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.buttonGradient}
            >
              <Text
                style={[
                  styles.primaryButtonText,
                  !reflectionText.trim() && { color: "#94A3B8" },
                ]}
              >
                Complete Practice
              </Text>
            </LinearGradient>
          </TactileTouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );

  const renderSummaryScreen = () => (
    <View style={styles.contentContainerCentered}>
      <ConfettiAnimation />

      <View style={styles.checkmarkContainer}>
        <LinearGradient
          colors={["#10B981", "#059669"]}
          style={styles.checkmarkCircle}
        >
          <Icon name="check" size={60} color="#FFFFFF" />
        </LinearGradient>
      </View>

      <View style={styles.textContainer}>
        <Text style={styles.summaryTitle}>Well done!</Text>
        <Text style={styles.summaryText}>
          You've completed the challenge. Keep up the momentum!
        </Text>
      </View>

      <View style={styles.xpTag}>
        <Icon name="star" size={14} color={theme.colors.library.orange[600]} />
        <Text style={styles.xpTagText}>
          +{challengeData.xpReward || 50} XP Earned
        </Text>
      </View>

      <View style={styles.footer}>
        <TactileTouchableOpacity
          style={styles.primaryButton}
          onPress={handleDone}
          activeOpacity={0.9}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <LinearGradient
            colors={[
              theme.colors.library.orange[400],
              theme.colors.library.orange[500],
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.buttonGradient}
          >
            <Text style={styles.primaryButtonText}>Done</Text>
          </LinearGradient>
        </TactileTouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.mainContainer}>
      <LinearGradient
        colors={["#FFF7ED", "#FFF"]} // Orange-50 to White
        style={styles.gradientBackground}
      />
      {/* Could add a custom back button header here if needed */}

      {currentStep === ChallengeStep.START && renderStartScreen()}
      {currentStep === ChallengeStep.INSTRUCTION && renderInstructionScreen()}
      {currentStep === ChallengeStep.REFLECTION && renderReflectionScreen()}
      {currentStep === ChallengeStep.SUMMARY && renderSummaryScreen()}
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: theme.colors.background.default,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 50, // Space for status bar
    marginBottom: 10,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.6)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  headerTitle: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
    fontSize: 16,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 10,
  },
  contentContainerCentered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 40,
  },

  // Hero Section (Start Screen)
  heroSection: {
    alignItems: "center",
    marginVertical: 32,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    borderWidth: 1,
    borderColor: theme.colors.library.orange[200],
  },
  titleText: {
    ...parseTextStyle(theme.typography.Heading2),
    color: theme.colors.text.title,
    textAlign: "center",
    marginBottom: 12,
  },
  subtitleText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
    textAlign: "center",
    lineHeight: 24,
    maxWidth: 280,
  },

  // Info Card
  cardContainer: {
    ...parseShadowStyle(theme.shadow.elevation1),
    alignItems: "center",
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  infoIconBg: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.library.orange[100],
    alignItems: "center",
    justifyContent: "center",
  },
  infoText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
    fontWeight: "600",
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: theme.colors.library.gray[200],
    marginHorizontal: 16,
  },

  // Instructions
  stepHeader: {
    ...parseTextStyle(theme.typography.Heading2),
    color: theme.colors.text.title,
    marginBottom: 16,
  },
  stepSubHeader: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
    marginBottom: 24,
  },
  scrollView: {
    flex: 1,
  },
  instructionCard: {
    ...parseShadowStyle(theme.shadow.elevation1),
    borderRadius: 24,
    marginBottom: 24,
  },
  cardGradient: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  instructionText: {
    ...parseTextStyle(theme.typography.Heading3), // Large readable text
    color: theme.colors.text.default,
    lineHeight: 32,
    fontWeight: "500",
  },
  encouragementContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: theme.colors.library.orange[100],
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.library.orange[100],
  },
  tipIcon: {
    marginTop: 2,
  },
  encouragementText: {
    flex: 1,
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.library.orange[800],
    fontStyle: "italic",
    lineHeight: 20,
  },

  // Reflection
  textArea: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: theme.colors.library.gray[200],
    borderRadius: 20,
    padding: 20,
    minHeight: 200,
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
    marginBottom: 24,
    ...parseShadowStyle(theme.shadow.elevation1),
  },

  // Summary
  checkmarkContainer: {
    padding: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  checkmarkCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  textContainer: {
    alignItems: "center",
    gap: 12,
  },
  summaryTitle: {
    ...parseTextStyle(theme.typography.Heading1),
    color: theme.colors.text.title,
    textAlign: "center",
    fontSize: 32,
    letterSpacing: -0.5,
  },
  summaryText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
    textAlign: "center",
    maxWidth: 300,
    lineHeight: 24,
    opacity: 0.8,
  },
  xpTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: theme.colors.library.orange[100],
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.library.orange[100],
    marginTop: 20,
  },
  xpTagText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.library.orange[700],
    fontWeight: "700",
    textTransform: "uppercase",
  },

  // Buttons & Footer
  footer: {
    paddingBottom: 40,
    paddingTop: 20,
    width: "100%",
  },
  primaryButton: {
    width: "100%",
    height: 56,
    borderRadius: 28,
    ...parseShadowStyle(theme.shadow.elevation1),
  },
  buttonGradient: {
    flex: 1,
    borderRadius: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryButtonText: {
    ...parseTextStyle(theme.typography.Heading3),
    color: "#FFF",
    fontSize: 18,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  gradientBackground: {
    ...StyleSheet.absoluteFillObject,
  },
});

export default RealLifeChallenge;
