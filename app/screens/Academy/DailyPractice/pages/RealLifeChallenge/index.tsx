import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import React, { useState } from "react";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import Icon from "react-native-vector-icons/FontAwesome5";
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
import DonePractice from "../../components/DonePractice";

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
    <ScrollView
      style={styles.scrollView}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={styles.heroSection}>
        {/* Large Hero Watermark */}
        <View style={styles.heroWatermarkContainer} pointerEvents="none">
          <Icon
            name="mountain"
            size={220}
            color={theme.colors.library.orange[600]}
            style={styles.heroWatermark}
          />
        </View>

        <View style={styles.heroTextContainer}>
          <Text style={styles.titleText}>{title}</Text>
          <Text style={styles.subtitleText}>{description}</Text>
        </View>
      </View>

      <View style={styles.bentoGrid}>
        {/* Row 1: Time & Reward */}
        <View style={styles.bentoRow}>
          <View style={[styles.bentoCard, styles.halfBento]}>
            <LinearGradient
              colors={["#E0F2FE", "#F0F9FF"]}
              style={styles.cardGradient}
            >
              {/* Card Watermark */}
              <View style={styles.cardWatermarkContainer} pointerEvents="none">
                <Icon
                  name="clock"
                  size={80}
                  color="#0284C7"
                  style={styles.cardWatermark}
                />
              </View>

              <View style={styles.cardHeader}>
                <Text style={[styles.cardLabel, { color: "#0369A1" }]}>
                  Duration
                </Text>
              </View>
              <Text style={styles.cardValue}>
                {challengeData.durationMinutes
                  ? `${challengeData.durationMinutes} min`
                  : "Self-paced"}
              </Text>
            </LinearGradient>
          </View>

          <View style={[styles.bentoCard, styles.halfBento]}>
            <LinearGradient
              colors={["#FFF7ED", "#FFFAF0"]}
              style={styles.cardGradient}
            >
              {/* Card Watermark */}
              <View style={styles.cardWatermarkContainer} pointerEvents="none">
                <Icon
                  name="star"
                  size={80}
                  color="#EA580C"
                  style={styles.cardWatermark}
                />
              </View>

              <View style={styles.cardHeader}>
                <Text style={[styles.cardLabel, { color: "#9A3412" }]}>
                  Reward
                </Text>
              </View>
              <Text style={styles.cardValue}>
                +{challengeData.xpReward || 50} XP
              </Text>
            </LinearGradient>
          </View>
        </View>

        {/* Row 2: Focus Areas (Full Width Bento) */}
        <View style={[styles.bentoCard, styles.fullBento]}>
          <LinearGradient
            colors={["#F0FDF4", "#F6FFFA"]}
            style={styles.cardGradient}
          >
            {/* Card Watermark */}
            <View style={styles.cardWatermarkContainer} pointerEvents="none">
              <Icon
                name="bullseye"
                size={100}
                color="#16A34A"
                style={[styles.cardWatermark, { right: -10, bottom: -20 }]}
              />
            </View>

            <View style={styles.cardHeader}>
              <Text style={styles.cardLabelInline}>Key Practice Focus</Text>
            </View>
            <View style={styles.focusPills}>
              {[
                {
                  label: "Social Navigation",
                  color: "rgba(220, 252, 231, 0.6)",
                },
                { label: "Cognitive Flex", color: "rgba(220, 252, 231, 0.6)" },
                { label: "Real Success", color: "rgba(220, 252, 231, 0.6)" },
              ].map((pill, i) => (
                <View
                  key={i}
                  style={[
                    styles.pill,
                    {
                      backgroundColor: pill.color,
                      borderColor: "rgba(22, 163, 74, 0.1)",
                    },
                  ]}
                >
                  <Text style={styles.pillText}>{pill.label}</Text>
                </View>
              ))}
            </View>
          </LinearGradient>
        </View>
      </View>

      <View style={styles.footerSpacer} />
    </ScrollView>
  );

  const renderInstructionScreen = () => (
    <View style={styles.contentContainer}>
      <Text style={styles.stepHeader}>Step 1: The Challenge</Text>
      <Text style={styles.stepSubHeader}>Here's what you'll be doing</Text>

      <View style={styles.instructionCard}>
        <LinearGradient
          colors={["#FFF", "#F9FAFB"]}
          style={styles.cardGradient}
        >
          <Text style={styles.instructionText}>
            {challengeData.instructions}
          </Text>
        </LinearGradient>
      </View>

      <View style={styles.encouragementContainer}>
        <Icon
          name="lightbulb"
          size={18}
          color={theme.colors.library.orange[600]}
          style={styles.tipIcon}
        />
        <Text style={styles.encouragementText}>
          {challengeData.encouragement}
        </Text>
      </View>

      <View style={styles.footer}>
        <TactileTouchableOpacity
          style={styles.primaryButton}
          onPress={handleInstructionsComplete}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={[
              theme.colors.library.orange[400],
              theme.colors.library.orange[500],
            ]}
            style={styles.buttonGradient}
          >
            <Text style={styles.primaryButtonText}>Got it</Text>
          </LinearGradient>
        </TactileTouchableOpacity>
      </View>
    </View>
  );

  const renderReflectionScreen = () => (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.contentContainer}
    >
      <Text style={styles.stepHeader}>Step 2: Reflection</Text>
      <Text style={styles.stepSubHeader}>{completionPrompt}</Text>

      <TextInput
        style={styles.textArea}
        placeholder={challengeData.completionPlaceholder || "How did it go?"}
        multiline
        value={reflectionText}
        onChangeText={setReflectionText}
        placeholderTextColor="rgba(0,0,0,0.3)"
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
        >
          <LinearGradient
            colors={[
              theme.colors.library.orange[400],
              theme.colors.library.orange[500],
            ]}
            style={styles.buttonGradient}
          >
            <Text style={styles.primaryButtonText}>Complete Challenge</Text>
          </LinearGradient>
        </TactileTouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );

  const renderSummaryScreen = () => (
    <DonePractice practiceName="real-life challenge" />
  );

  return (
    <View style={styles.mainContainer}>
      <LinearGradient
        colors={["#FFF7ED", "#FFF"]}
        style={StyleSheet.absoluteFill}
      />

      {/* Ambient Decorations */}
      <View style={styles.ambientContainer} pointerEvents="none">
        <View style={[styles.ambientBubble, styles.bubble1]} />
        <View style={[styles.ambientBubble, styles.bubble2]} />
        <View style={[styles.ambientBubble, styles.bubble3]} />
      </View>

      {currentStep === ChallengeStep.START && renderStartScreen()}
      {currentStep === ChallengeStep.INSTRUCTION && renderInstructionScreen()}
      {currentStep === ChallengeStep.REFLECTION && renderReflectionScreen()}
      {currentStep === ChallengeStep.SUMMARY && renderSummaryScreen()}

      {currentStep === ChallengeStep.START && (
        <View style={styles.anchoredFooter}>
          <TactileTouchableOpacity
            style={styles.primaryButton}
            onPress={handleStart}
            activeOpacity={0.9}
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
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  // Main Layout
  mainContainer: {
    flex: 1,
    backgroundColor: "#FFF",
  },
  ambientContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  ambientBubble: {
    position: "absolute",
    borderRadius: 200,
    filter: "blur(60px)",
    opacity: 0.4,
  },
  bubble1: {
    width: 300,
    height: 300,
    top: -50,
    right: -100,
    backgroundColor: "#FFEDD5", // Orange 100
  },
  bubble2: {
    width: 250,
    height: 250,
    bottom: 100,
    left: -80,
    backgroundColor: "#E0F2FE", // Sky 100
  },
  bubble3: {
    width: 200,
    height: 200,
    top: "40%",
    right: -50,
    backgroundColor: "#F0FDF4", // Green 100
  },

  // Scroll Area
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 40, // Move title closer to top
    paddingBottom: 120, // Space for anchored footer
  },

  // Hero Section
  heroSection: {
    alignItems: "center",
    marginBottom: 32,
    marginTop: 20, // Reduced top margin
    position: "relative",
  },
  heroWatermarkContainer: {
    position: "absolute",
    top: -60, // Shift watermark up
    right: -80,
    zIndex: -1,
    transform: [{ rotate: "15deg" }],
  },
  heroWatermark: {
    opacity: 0.05,
  },
  heroTextContainer: {
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: 40, // Reduced margin since icon is gone
  },
  titleText: {
    ...parseTextStyle(theme.typography.Heading1),
    color: theme.colors.text.title,
    textAlign: "center",
    marginBottom: 12,
    letterSpacing: -0.8,
  },
  subtitleText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
    textAlign: "center",
    lineHeight: 24,
    opacity: 0.6,
  },

  // Bento Grid
  bentoGrid: {
    gap: 16,
  },
  bentoRow: {
    flexDirection: "row",
    gap: 16,
  },
  bentoCard: {
    borderRadius: 28,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.8)",
    // Removed backgroundColor: "#FFF" to prevent white bleed
    position: "relative",
  },
  halfBento: {
    flex: 1,
    minHeight: 140,
  },
  fullBento: {
    width: "100%",
    minHeight: 120,
  },
  cardWatermarkContainer: {
    position: "absolute",
    right: -15,
    bottom: -15,
    transform: [{ rotate: "-15deg" }],
    zIndex: 0,
  },
  cardWatermark: {
    opacity: 0.1,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
    zIndex: 1,
  },
  cardLabel: {
    ...parseTextStyle(theme.typography.BodySmall),
    opacity: 0.7,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  cardLabelInline: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.title,
    fontWeight: "700",
  },
  cardValue: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
    fontWeight: "800",
    marginTop: 4,
    zIndex: 1,
  },

  // Focus Pills
  focusPills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
    zIndex: 1,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.03)",
  },
  pillText: {
    ...parseTextStyle(theme.typography.BodyDetails),
    color: theme.colors.text.title,
    fontWeight: "600",
  },

  // Anchored Footer
  anchoredFooter: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 20,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  footerSpacer: {
    height: 40,
  },

  // Header
  header: {
    position: "absolute",
    top: 50,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.8)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  headerTitle: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
    fontSize: 16,
    fontWeight: "700",
  },

  // Instructions
  contentContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 100,
  },
  stepHeader: {
    ...parseTextStyle(theme.typography.Heading2),
    color: theme.colors.text.title,
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  stepSubHeader: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
    marginBottom: 24,
    opacity: 0.7,
  },
  instructionCard: {
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
  },

  textContainer: {
    alignItems: "center",
    gap: 12,
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
  // Summary Step
  contentContainerCentered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 40,
    zIndex: 5,
  },
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
    shadowRadius: 12,
    elevation: 8,
  },
  textContainerSummary: {
    alignItems: "center",
    gap: 12,
  },
  summaryTitle: {
    ...parseTextStyle(theme.typography.Heading1),
    color: theme.colors.text.title,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  summaryText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
    textAlign: "center",
    lineHeight: 24,
    opacity: 0.7,
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
    borderColor: "rgba(0,0,0,0.03)",
  },
  xpTagText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.library.orange[800],
    fontWeight: "700",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  gradientBackground: {
    ...StyleSheet.absoluteFillObject,
  },
});

export default RealLifeChallenge;
