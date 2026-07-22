// FORCE REFRESH BUNDLER - SYSTEM SYNC 1
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import { View, StyleSheet, TextInput } from "react-native";
import {
  getCognitivePracticeById,
  getEasierExposureVariant,
  getExposurePracticeById,
} from "../../../../../api/dailyPractice";
import { RealLifeChallengeData } from "../../../../../api/dailyPractice/types";
import {
  completePracticeActivity,
} from "../../../../../api/practiceActivities";
import { PracticeActivityContentType } from "../../../../../api/practiceActivities/types";
import { ExploreStackParamList } from "../../../../../navigators/stacks/ExploreStack/types";
import { useActivityStore } from "../../../../../stores/activity";
import { useUserStore } from "../../../../../stores/user";
import {
  Page,
  Surface,
  Text,
  Button,
  Icon,
  icons,
  useTheme,
  spacing,
  radius,
  fonts,
} from "../../../../../design-system";
import { useMarkActivityStart } from "../../../../../hooks/useMarkActivityStart";
import { useConfirmOnExit } from "../../../../../hooks/useConfirmOnExit";
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
  const { colors } = useTheme();
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

  /**
   * "idle" — the swap is offered; "loading" — fetching; "none" — the backend
   * says this is already the gentlest of its kind, so the offer is replaced by
   * a plain statement rather than a button that would do nothing.
   */
  const [easierState, setEasierState] = useState<"idle" | "loading" | "none">(
    "idle",
  );

  const handleTryEasier = async () => {
    const sourceId = practiceActivityState?.exposurePractice?.id;
    if (!sourceId) return;

    setEasierState("loading");
    const easier = await getEasierExposureVariant(sourceId);

    if (!easier) {
      // Already the gentlest rung, or the only easier options are locked behind
      // a pack. Either way there is nothing to offer, and saying so plainly is
      // kinder than a button that silently fails.
      setEasierState("none");
      return;
    }

    // Swap in place rather than pushing a new screen: the user asked for THIS
    // challenge to be gentler, so landing them back on a briefing for the same
    // step — with the easier challenge in it — keeps their place in the flow.
    setPracticeActivityState({
      id: undefined,
      contentType: PracticeActivityContentType.EXPOSURE_PRACTICE,
      exposurePractice: easier,
    } as any);
    setCurrentActivityId(null);
    setCurrentStep(ChallengeStep.INSTRUCTION);
    setEasierState("idle");
  };

  const [currentStep, setCurrentStep] = useState<ChallengeStep>(initialStep);
  const [reflectionText, setReflectionText] = useState("");
  const [showVitalsModal, setShowVitalsModal] = useState(false);
  const [showIRLModal, setShowIRLModal] = useState(false);

  // Derived from practiceActivityState (the LIVE activity), not from the
  // `practiceActivity` route param. Two things were broken while these read the
  // param:
  //
  // 1. Entering by id alone — which is how the Home recommendation card opens
  //    this screen — leaves the param undefined, so contentId was undefined,
  //    markActivityStart() hit its `if (!contentId)` guard and returned null,
  //    and the activity was never created. The user completed the challenge and
  //    nothing was recorded.
  // 2. After "Try something easier", the swap writes a NEW activity into
  //    practiceActivityState, but the param still held the original harder
  //    challenge — so the eased attempt was filed against the challenge the
  //    user had just stepped away from, corrupting the very signal the graded
  //    -exposure feature exists to collect.
  const rlcContentId =
    practiceActivityState?.cognitivePractice?.id ||
    practiceActivityState?.exposurePractice?.id;
  const rlcContentType = practiceActivityState?.cognitivePractice
    ? PracticeActivityContentType.COGNITIVE_PRACTICE
    : PracticeActivityContentType.EXPOSURE_PRACTICE;

  const markActivityStart = useMarkActivityStart({
    contentType: rlcContentType,
    contentId: rlcContentId,
    // Also the live state, for the same reason — and this one bites hardest on
    // the swap. handleTryEasier sets the new state with `id: undefined` and
    // clears currentActivityId, so useMarkActivityStart falls back to
    // `initialActivity?.id`. Pointing that at the route param handed it the
    // ORIGINAL activity's id, so the eased attempt was recorded against the
    // harder challenge. Reading live state yields undefined here, which is
    // what makes it create a fresh activity for the easier one.
    initialActivity: practiceActivityState,
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

  // --- Confirm-on-exit: prompt to save/discard if leaving mid-practice ---
  // Save opens the existing vitals modal (the normal completion path). RLC has
  // no family landing, so Discard returns to the Explore landing.
  const { exitSheet } = useConfirmOnExit({
    navigation,
    activityId: currentActivityId,
    isCompleted: currentStep === ChallengeStep.SUMMARY || showVitalsModal,
    onSave: () => setShowVitalsModal(true),
    family: "Explore",
    from,
    packContext,
  });

  if (!challengeData) {
    return (
      <Page
        title="Real Life Challenge"
        onBack={() => navigation.goBack()}
        footer={<Button label="Go Back" onPress={() => navigation.goBack()} />}
      >
        <Surface level="default" rounded="card" padded={spacing.xl}>
          <Text variant="body" color="secondary">
            Error: Missing challenge data.
          </Text>
        </Surface>
        {exitSheet}
      </Page>
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
        // @ts-expect-error — PackModule param list isn't propagated to this screen's nav prop
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

  // Step 1 — the challenge briefing.
  if (currentStep === ChallengeStep.INSTRUCTION) {
    return (
      <>
        <Page
          title={title}
          description="Here's what you need to do"
          onBack={handleBack}
          footer={
            <Button
              label="Log My Experience"
              onPress={handleInstructionsComplete}
            />
          }
        >
          <View style={styles.stepBadge}>
            <View
              style={[
                styles.stepChip,
                { backgroundColor: colors.action.primaryTint },
              ]}
            >
              <Text variant="caption" color="link">
                STEP 1
              </Text>
            </View>
            <Text variant="h2" color="primary">
              The Challenge
            </Text>
          </View>

          {/* Instructions card — the legacy markdown renders on a light reading
           *  sheet so the pack-authored copy stays legible on the dark canvas. */}
          <Surface level="default" rounded="card" padded={spacing.xl}>
            <View style={styles.cardLabelRow}>
              <Icon
                name={icons.checklist}
                size={14}
                color={colors.text.accent}
              />
              <Text variant="label" color="primary">
                INSTRUCTIONS
              </Text>
            </View>
            <SimpleMarkdown
              content={challengeData.instructions}
              variant="instruction"
              textColor={colors.text.secondary}
            />
          </Surface>

          {/* Pro tip — a soft orange-tint island. */}
          <Surface
            level="default"
            rounded="card"
            padded={spacing.xl}
            style={{ backgroundColor: colors.action.primaryTint }}
          >
            <View style={styles.cardLabelRow}>
              <Icon name={icons.tip} size={14} color={colors.text.link} />
              <Text variant="label" color="link">
                PRO TIP
              </Text>
            </View>
            <Text variant="body" color="secondary" style={styles.tipText}>
              {challengeData.encouragement}
            </Text>
          </Surface>

          {/*
            GO AT YOUR OWN PACE.

            The Stuttering Foundation's warning is that facing a feared
            situation and FAILING repeatedly makes the fear worse, not better —
            the remedy is starting smaller. Until now the app had no smaller: it
            offered the same challenge again the next day, and not one of the
            103 exposure activities said anywhere that stepping down was allowed.

            Deliberately plain and always visible, rather than a prompt that
            appears after a skip. Someone deciding whether to attempt this at all
            should be able to see the gentler option BEFORE they fail at this
            one — offering it only afterwards makes it a consolation prize.
          */}
          <View style={styles.pacingRow}>
            <Text variant="bodySm" color="tertiary" center>
              Go at your own pace. Starting smaller is a real choice, not a
              step backwards.
            </Text>
            {easierState === "none" ? (
              <Text variant="label" color="tertiary" center>
                This is already the gentlest challenge of its kind.
              </Text>
            ) : (
              <Button
                label={
                  easierState === "loading"
                    ? "Finding something easier…"
                    : "Try something easier"
                }
                variant="secondary"
                disabled={easierState === "loading"}
                onPress={handleTryEasier}
              />
            )}
          </View>
        </Page>

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

        {exitSheet}
      </>
    );
  }

  // Step 2 — reflection.
  return (
    <>
      <Page
        title={title}
        description={completionPrompt}
        onBack={handleBack}
        keyboardAvoiding
        footer={
          <Button
            label="Complete Challenge"
            onPress={handleReflectionComplete}
            disabled={!reflectionText.trim()}
          />
        }
      >
        <View style={styles.reflectionHeader}>
          <View
            style={[
              styles.stepChip,
              { backgroundColor: colors.action.primaryTint },
            ]}
          >
            <Text variant="caption" color="link">
              STEP 2
            </Text>
          </View>
          <Text variant="h2" color="primary">
            Reflection
          </Text>
        </View>

        <Surface
          level="default"
          rounded="input"
          style={[styles.textAreaSurface, { borderColor: colors.input.border }]}
        >
          <TextInput
            value={reflectionText}
            onChangeText={setReflectionText}
            placeholder={challengeData.completionPlaceholder || "How did it go?"}
            placeholderTextColor={colors.input.placeholder}
            multiline
            textAlignVertical="top"
            style={[styles.textAreaInput, { color: colors.text.primary }]}
          />
        </Surface>
      </Page>

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

      {exitSheet}
    </>
  );
};

const styles = StyleSheet.create({
  pacingRow: {
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  stepBadge: {
    gap: spacing.sm,
  },
  reflectionHeader: {
    gap: spacing.sm,
  },
  stepChip: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  cardLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  tipText: {
    lineHeight: 22,
  },
  textAreaSurface: {
    borderWidth: 1,
    overflow: "hidden",
  },
  textAreaInput: {
    minHeight: 200,
    padding: spacing.xl,
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 24,
  },
});

export default RealLifeChallenge;
