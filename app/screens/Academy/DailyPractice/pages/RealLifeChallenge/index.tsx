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
      <View style={styles.headerTitleContainer}>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {title}
        </Text>
      </View>
      <View style={{ width: 36 }} />
    </View>
  );

  const renderStartScreen = () => (
    <ScrollView
      style={styles.scrollView}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={styles.compactHero}>
        <Text style={styles.compactSubtitleText}>{description}</Text>
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

      {/* Start Button Integrated in Scroll */}
      <View style={styles.startActionContainer}>
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
      {/* Premium 3-Stop Gradient Background */}
      <LinearGradient
        colors={["#FFF7ED", "#FDF2F8", "#FFFFFF"]}
        locations={[0, 0.4, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Dynamic Ambient Decorations */}
      <View style={styles.ambientContainer} pointerEvents="none">
        <View style={[styles.ambientBubble, styles.bubble1]} />
        <View style={[styles.ambientBubble, styles.bubble2]} />
        <View style={[styles.ambientBubble, styles.bubble3]} />
      </View>

      {renderHeader()}
      {currentStep === ChallengeStep.START && renderStartScreen()}
      {currentStep === ChallengeStep.INSTRUCTION && renderInstructionScreen()}
      {currentStep === ChallengeStep.REFLECTION && renderReflectionScreen()}
      {currentStep === ChallengeStep.SUMMARY && renderSummaryScreen()}
    </View>
  );
};

const styles = StyleSheet.create({
  // Main Layout
  mainContainer: {
    flex: 1,
    backgroundColor: "#FFF",
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  ambientContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  ambientBubble: {
    position: "absolute",
    borderRadius: 300,
    filter: "blur(80px)", // Softer, larger blur
    opacity: 0.5,
  },
  bubble1: {
    width: 400,
    height: 400,
    top: -100,
    right: -120,
    backgroundColor: "#FFE4E6", // Rose 100
  },
  bubble2: {
    width: 350,
    height: 350,
    bottom: 50,
    left: -100,
    backgroundColor: "#E0F2FE", // Sky 100
  },
  bubble3: {
    width: 300,
    height: 300,
    top: "35%",
    right: -80,
    backgroundColor: "#DCFCE7", // Green 100
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 12 : 24,
    paddingBottom: 12,
    zIndex: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.7)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.8)",
  },
  headerTitleContainer: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  headerTitle: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
    fontWeight: "800",
    letterSpacing: -0.5,
  },

  // Scroll Area
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 32,
  },

  // Compact Hero
  compactHero: {
    marginBottom: 20,
    width: "100%",
    paddingHorizontal: 4,
  },
  compactSubtitleText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
    lineHeight: 22,
    opacity: 0.85,
    textAlign: "center",
  },

  // Bento Grid (Glass Edition)
  bentoGrid: {
    gap: 16,
  },
  bentoRow: {
    flexDirection: "row",
    gap: 16,
  },
  bentoCard: {
    borderRadius: 32,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.9)",
    backgroundColor: "rgba(255, 255, 255, 0.5)", // Glass effect
    position: "relative",
  },
  startActionContainer: {
    marginTop: 24,
    width: "100%",
  },

  halfBento: {
    flex: 1,
    minHeight: 150,
  },
  fullBento: {
    width: "100%",
    minHeight: 140,
  },
  cardGradient: {
    flex: 1,
    padding: 24,
    justifyContent: "flex-end",
  },

  // Artifact Watermarks
  cardWatermarkContainer: {
    position: "absolute",
    right: -10,
    bottom: -15,
    opacity: 0.15,
  },
  cardWatermark: {
    transform: [{ rotate: "-15deg" }],
  },

  cardHeader: {
    marginBottom: 6,
  },
  cardLabel: {
    ...parseTextStyle(theme.typography.BodyDetails),
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    opacity: 0.8,
  },
  cardLabelInline: {
    ...parseTextStyle(theme.typography.BodyDetails),
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    color: theme.colors.text.title,
    opacity: 0.6,
    marginBottom: 12,
  },
  cardValue: {
    ...parseTextStyle(theme.typography.Heading2),
    color: theme.colors.text.title,
    fontWeight: "800",
  },

  // Pillars / Focus
  focusPills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  pillText: {
    ...parseTextStyle(theme.typography.BodySmall),
    fontWeight: "700",
    color: theme.colors.text.title,
  },

  // Instructions Step
  stepHeader: {
    ...parseTextStyle(theme.typography.Heading2),
    color: theme.colors.text.title,
    marginBottom: 8,
    fontWeight: "800",
  },
  stepSubHeader: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
    marginBottom: 24,
    opacity: 0.7,
  },
  instructionCard: {
    borderRadius: 24,
    overflow: "hidden",
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  instructionText: {
    ...parseTextStyle(theme.typography.Body),
    padding: 24,
    color: theme.colors.text.default,
    lineHeight: 26,
  },
  encouragementContainer: {
    flexDirection: "row",
    backgroundColor: theme.colors.library.orange[100],
    padding: 16,
    borderRadius: 20,
    alignItems: "center",
    gap: 12,
  },
  tipIcon: {
    marginTop: 2,
  },
  encouragementText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.library.orange[800],
    flex: 1,
    fontWeight: "600",
    fontStyle: "italic",
  },

  // Reflection/Final Steps
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
    marginTop: "auto",
    paddingBottom: 24,
  },
  primaryButton: {
    width: "100%",
    height: 58,
    borderRadius: 24,
    overflow: "hidden",
  },
  buttonGradient: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  primaryButtonText: {
    ...parseTextStyle(theme.typography.Button),
    color: "#FFF",
    fontSize: 18,
    fontWeight: "800",
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
