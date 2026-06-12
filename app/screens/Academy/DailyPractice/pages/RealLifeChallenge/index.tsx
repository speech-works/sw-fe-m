// FORCE REFRESH BUNDLER - SYSTEM SYNC 1
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import Icon from "react-native-vector-icons/FontAwesome5";
import { getCognitivePracticeById, getExposurePracticeById } from "../../../../../api/dailyPractice";
import { RealLifeChallengeData } from "../../../../../api/dailyPractice/types";
import {
  completePracticeActivity,
} from "../../../../../api/practiceActivities";
import { PracticeActivityContentType } from "../../../../../api/practiceActivities/types";
import Button from "../../../../../components/Button";
import { TactileTouchableOpacity } from "../../../../../components/TactileTouchableOpacity";
import { ExploreStackParamList } from "../../../../../navigators/stacks/ExploreStack/types";
import { useActivityStore } from "../../../../../stores/activity";
import { useUserStore } from "../../../../../stores/user";
import { theme } from "../../../../../Theme/tokens";
import { parseTextStyle } from "../../../../../util/functions/parseStyles";
import { useMarkActivityStart } from "../../../../../hooks/useMarkActivityStart";
import DonePractice from "../../components/DonePractice";
import VitalsFeedbackModal from "../../../../../components/VitalsFeedbackModal";
import { SimpleMarkdown } from "../../../../../components/Pack/SimpleMarkdown";
import IRLConfirmationModal from "../../../../../components/IRLConfirmationModal";

enum ChallengeStep {
  INSTRUCTION = 0,
  REFLECTION = 1,
  SUMMARY = 2,
}

import { PracticeActivity } from "../../../../../api/practiceActivities/types";
import { PackContext } from "../../../../../utils/packActivityNavigation";

type RealLifeChallengeParams = {
  id?: string;
  practiceActivity?: PracticeActivity;
  packContext?: PackContext;
};

const RealLifeChallenge = () => {
  const navigation = useNavigation();
  const route =
    useRoute<RouteProp<ExploreStackParamList, "RealLifeChallenge">>();
  const params = route.params as RealLifeChallengeParams & { from?: string };
  const { practiceActivity, packContext, from } = params || {};
  const { user } = useUserStore();
  const { updateActivity } = useActivityStore();
  const insets = useSafeAreaInsets();
  const HEADER_HEIGHT = 64;
  const [currentActivityId, setCurrentActivityId] = useState<string | null>(
    practiceActivity?.id || null,
  );

  // Extract data based on where it's stored (Cognitive or Exposure)
  const [practiceActivityState, setPracticeActivityState] = useState<PracticeActivity | undefined>(practiceActivity);
  const [isFetching, setIsFetching] = useState(false);

  const challengeData: RealLifeChallengeData | undefined =
    practiceActivityState?.cognitivePractice?.realLifeChallengeData ||
    practiceActivityState?.exposurePractice?.realLifeChallengeData;

  // Auto-fetch activity if only ID is provided (from recommendations)
  useEffect(() => {
    const fetchPractice = async () => {
      const id = (route.params as any)?.id;
      if (!practiceActivityState && id) {
        setIsFetching(true);
        try {
          // Attempt to fetch as cognitive practice first
          const cp = await getCognitivePracticeById(id).catch(() => null);
          if (cp) {
            setPracticeActivityState({
              id: undefined,
              contentType: PracticeActivityContentType.COGNITIVE_PRACTICE,
              cognitivePractice: cp,
            } as any);
          } else {
            // Attempt to fetch as exposure practice
            const ep = await getExposurePracticeById(id);
            if (ep) {
              setPracticeActivityState({
                id: undefined,
                contentType: PracticeActivityContentType.EXPOSURE_PRACTICE,
                exposurePractice: ep,
              } as any);
            }
          }
        } catch (err) {
          console.error("Failed to fetch practice for challenge screen", err);
        } finally {
          setIsFetching(false);
        }
      }
    };
    fetchPractice();
  }, [route.params]);

  // Always start with Instructions for Real Life Challenges
  const initialStep = ChallengeStep.INSTRUCTION;

  const [currentStep, setCurrentStep] = useState<ChallengeStep>(initialStep);
  const [reflectionText, setReflectionText] = useState("");
  const [showVitalsModal, setShowVitalsModal] = useState(false);
  const [showIRLModal, setShowIRLModal] = useState(false);

  const rlcContentId =
    practiceActivity?.cognitivePractice?.id ||
    practiceActivity?.exposurePractice?.id;
  const rlcContentType = practiceActivity?.cognitivePractice
    ? PracticeActivityContentType.COGNITIVE_PRACTICE
    : PracticeActivityContentType.EXPOSURE_PRACTICE;

  const markActivityStart = useMarkActivityStart({
    contentType: rlcContentType,
    contentId: rlcContentId,
    initialActivity: practiceActivity,
    packContext,
    currentActivityId,
    setActivityId: setCurrentActivityId,
    navigation,
    logTag: "RealLifeChallenge",
    // RealLifeChallenge historically does not emit ACTIVITY_STARTED analytics.
    trackStart: false,
  });

  // Auto-start activity on mount if not already started
  useEffect(() => {
    if (!packContext?.alreadyStarted && currentStep === ChallengeStep.INSTRUCTION && !isFetching && challengeData) {
      markActivityStart();
    }
  }, [isFetching, challengeData]);

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
    practiceActivity?.cognitivePractice?.name ||
    practiceActivity?.exposurePractice?.name ||
    "Real Life Challenge";
  const description =
    practiceActivity?.cognitivePractice?.description ||
    practiceActivity?.exposurePractice?.description ||
    "Complete this real-world task.";

  // --- Handlers ---

  const markActivityComplete = async (vitals?: {
    effortScore: number;
    autonomyScore: number;
    accuracyScore?: number;
  }) => {
    if (!currentActivityId) return;
    try {
      // If we are in a pack, we rely on the backend handling the "pack-session" logic or similar
      // inside completePracticeActivity if needed, but usually completePracticeActivity just needs ID and UserID.
      const userId = user?.id; // Always use real ID if available
      if (!userId) {
        console.error("Missing userId for activity completion");
        return;
      }

      const completedActivity = await completePracticeActivity({
        id: currentActivityId,
        userId: userId,
        packId: packContext?.packId,
        moduleId: packContext?.moduleId,
        vitals,
      });

      updateActivity(currentActivityId, {
        ...completedActivity,
      });
      useUserStore.getState().fetchUser();
    } catch (err) {
      console.error("Failed to complete activity", err);
    }
  };

  const handleStart = async () => {
    await markActivityStart();
    setCurrentStep(ChallengeStep.INSTRUCTION);
  };

  const handleInstructionsComplete = () => {
    setShowIRLModal(true);
  };

  const handleIRLConfirm = () => {
    setShowIRLModal(false);
    setCurrentStep(ChallengeStep.REFLECTION);
  };

  const handleReflectionComplete = async () => {
    console.log("Saving reflection:", reflectionText);
    setShowVitalsModal(true);
  };

  const handleVitalsSubmit = async (vitals?: {
    effortScore: number;
    autonomyScore: number;
    accuracyScore?: number;
  }) => {
    setShowVitalsModal(false);
    await markActivityComplete(vitals);
    setCurrentStep(ChallengeStep.SUMMARY);
  };

  const handleDone = () => {
    // If pack context exists
    if (packContext && practiceActivity) {
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        // Fallback if we can't pop (shouldn't happen in normal flow but good safety)
        // @ts-ignore
        navigation.navigate("PackModule", {
          packId: packContext.packId,
          moduleId: packContext.moduleId,
          initialBlockIndex: packContext.blockIndex,
        });
      }
    } else {
      navigation.goBack();
    }
  };

  const handleBack = () => {
    if (from === "MOOD_CHECK") {
      (navigation as any).navigate("Root", { screen: "HOME" });
    } else if (currentStep === ChallengeStep.INSTRUCTION) {
      navigation.goBack();
    } else {
      setCurrentStep(currentStep - 1);
    }
  };

  // --- Render Steps ---

  const renderHeader = () => (
    <BlurView
      intensity={80}
      tint="light"
      style={[
        styles.header,
        {
          paddingTop: insets.top + (Platform.OS === "android" ? 12 : 0),
          height: HEADER_HEIGHT + insets.top,
        },
      ]}
    >
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
      <View style={{ width: 40 }} />
    </BlurView>
  );


  const renderInstructionScreen = () => (
    <ScrollView
      style={styles.scrollView}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={styles.stepHeaderContainer}>
        <View style={styles.stepIndicator}>
          <Text style={styles.stepIndicatorText}>STEP 1</Text>
        </View>
        <Text style={styles.premiumStepHeader}>The Challenge</Text>
        <Text style={styles.premiumStepSubHeader}>
          Here's what you need to do
        </Text>
      </View>

      <View style={styles.premiumInstructionCard}>
        <LinearGradient
          colors={["rgba(255,255,255,0.8)", "rgba(255,255,255,0.4)"]}
          style={styles.instructionCardGradient}
        >
          {/* Watermark Icon */}
          <View
            style={styles.instructionWatermarkContainer}
            pointerEvents="none"
          >
            <Icon
              name="clipboard-list"
              size={120}
              color={theme.colors.text.title}
              style={styles.instructionWatermark}
            />
          </View>

          <SimpleMarkdown
            content={challengeData.instructions}
            variant="instruction"
          />
        </LinearGradient>
      </View>

      <View style={styles.premiumTipCard}>
        <LinearGradient
          colors={["#FFF7ED", "#FFEDD5"]} // Orange-ish tint
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.tipGradient}
        >
          {/* Watermark Icon for Tip */}
          <View style={styles.tipWatermarkContainer} pointerEvents="none">
            <Icon
              name="lightbulb"
              size={80}
              color={theme.colors.library.orange[500]}
              style={styles.tipWatermark}
            />
          </View>

          <Text style={styles.tipTitle}>PRO TIP</Text>
          <Text style={styles.premiumTipText}>
            {challengeData.encouragement}
          </Text>
        </LinearGradient>
      </View>

      {/* Action button removed from scroll */}
    </ScrollView>
  );

  const renderReflectionScreen = () => (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.contentContainer}
      contentContainerStyle={{ flex: 1 }}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
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
      </ScrollView>
    </KeyboardAvoidingView>
  );

  const renderSummaryScreen = () => (
    <DonePractice
      practiceName="real-life challenge"
      activityId={currentActivityId ?? undefined}
      contentType={
        practiceActivityState?.cognitivePractice
          ? PracticeActivityContentType.COGNITIVE_PRACTICE
          : PracticeActivityContentType.EXPOSURE_PRACTICE
      }
      onDone={packContext ? handleDone : undefined}
      from={from as any}
    />
  );

  if (currentStep === ChallengeStep.SUMMARY) {
    return renderSummaryScreen();
  }

  const renderBottomAction = () => {
    if (currentStep === ChallengeStep.INSTRUCTION) {
      return (
        <View
          style={[
            styles.fixedBottomAction,
            { paddingBottom: Math.max(insets.bottom, 24) },
          ]}
        >
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
              <Text style={styles.primaryButtonText}>Log My Experience</Text>
            </LinearGradient>
          </TactileTouchableOpacity>
        </View>
      );
    }
    if (currentStep === ChallengeStep.REFLECTION) {
      return (
        <View
          style={[
            styles.fixedBottomAction,
            { paddingBottom: Math.max(insets.bottom, 24) },
          ]}
        >
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
      );
    }
    return null;
  };

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
      {currentStep === ChallengeStep.INSTRUCTION && renderInstructionScreen()}
      {currentStep === ChallengeStep.REFLECTION && renderReflectionScreen()}
      {renderBottomAction()}

      <VitalsFeedbackModal
        visible={showVitalsModal}
        onSkip={() => handleVitalsSubmit(undefined)}
        onSubmit={handleVitalsSubmit}
      />

      <IRLConfirmationModal
        visible={showIRLModal}
        onClose={() => setShowIRLModal(false)}
        onConfirm={handleIRLConfirm}
      />
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
    // paddingTop handled dynamically via insets
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
    fontWeight: "600",
    letterSpacing: -0.5,
  },

  // Scroll Area
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 160, // Increased to clear fixed bottom button
  },

  // Instructions Styles
  stepHeaderContainer: {
    marginBottom: 24,
    paddingHorizontal: 4,
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
    borderRadius: 16,
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
    justifyContent: "center",
    alignItems: "center",
  },

  // Header Spacer
  headerSpacer: {
    height: 0,
  },

  stepIndicator: {
    backgroundColor: theme.colors.library.orange[100],
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 12,
  },
  stepIndicatorText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.library.orange[800],
    fontWeight: "800",
    fontSize: 10,
    letterSpacing: 1,
  },
  premiumStepHeader: {
    ...parseTextStyle(theme.typography.Heading2),
    color: theme.colors.text.title,
    fontWeight: "600",
    fontSize: 24,
    marginBottom: 4,
  },
  premiumStepSubHeader: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
    opacity: 0.7,
    fontSize: 16,
  },

  // Premium Instruction Card
  premiumInstructionCard: {
    borderRadius: 32,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.9)",
    backgroundColor: "rgba(255, 255, 255, 0.6)", // Glass effect
    marginBottom: 24,
    shadowColor: theme.colors.library.orange[200], // Subtle orange shadow
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  instructionCardGradient: {
    padding: 24,
    justifyContent: "center",
    minHeight: 200,
    flex: 1,
  },
  instructionWatermarkContainer: {
    position: "absolute",
    right: -20,
    bottom: -20,
    opacity: 0.05,
    transform: [{ rotate: "-10deg" }],
  },
  instructionWatermark: {
    // sizing handled in icon
  },
  premiumInstructionText: {
    ...parseTextStyle(theme.typography.Heading3), // Larger text for instructions
    color: theme.colors.text.title,
    lineHeight: 32,
    fontWeight: "600",
  },

  // Premium Tip Card
  premiumTipCard: {
    borderRadius: 24,
    overflow: "hidden",
    marginBottom: 32,
    borderWidth: 1,
    borderColor: "rgba(255, 237, 213, 0.5)", // Orange-100ish
  },
  tipGradient: {
    padding: 20,
  },
  tipHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  tipTitle: {
    ...parseTextStyle(theme.typography.BodySmall),
    fontWeight: "900",
    color: theme.colors.library.orange[800],
    textTransform: "uppercase",
    fontSize: 10,
    letterSpacing: 1.5,
    marginBottom: 6,
    opacity: 0.8,
  },
  tipWatermarkContainer: {
    position: "absolute",
    right: -10,
    bottom: -15,
    opacity: 0.1,
    transform: [{ rotate: "-15deg" }],
  },
  tipWatermark: {
    // sizing in icon
  },
  premiumTipText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.library.orange[800],
    opacity: 0.9,
    fontSize: 15,
    lineHeight: 22,
  },

  // Action Container
  actionContainer: {
    marginBottom: 20,
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
  fixedBottomAction: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    backgroundColor: "transparent",
    zIndex: 10,
  },
});

export default RealLifeChallenge;
