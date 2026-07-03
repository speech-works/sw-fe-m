import { useNavigation, useRoute } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import { ScrollView, StatusBar, StyleSheet, View } from "react-native";
import { useMarkActivityStart } from "../../../../../../hooks/useMarkActivityStart";
import { useConfirmOnExit } from "../../../../../../hooks/useConfirmOnExit";
import { getCognitivePracticeByType } from "../../../../../../api/dailyPractice";
import {
  CognitivePracticeType,
  ReframingThoughtScenarioData,
} from "../../../../../../api/dailyPractice/types";
import {
  completePracticeActivity,
} from "../../../../../../api/practiceActivities";
import { PracticeActivityContentType } from "../../../../../../api/practiceActivities/types";
import { useSessionStore } from "../../../../../../stores/session";
import PressableScale from "../../../../../../components/PressableScale";
import TextArea from "../../../../../../components/TextArea";
import {
  Button,
  Surface,
  Text,
  Icon,
  PageHeader,
  Gradient,
  FloatingControls,
  useTheme,
  spacing,
  space,
  radius,
} from "../../../../../../design-system";
import {
  CDPStackNavigationProp,
  CDPStackParamList,
} from "../../../../../../navigators/stacks/ExploreStack/DailyPracticeStack/CognitivePracticeStack/types";
import {
  ExploreStackNavigationProp,
  ExploreStackParamList,
} from "../../../../../../navigators/stacks/ExploreStack/types";
import { useActivityStore } from "../../../../../../stores/activity";
import { useUserStore } from "../../../../../../stores/user";
import DonePractice from "../../../components/DonePractice";
import VitalsFeedbackModal from "../../../../../../components/VitalsFeedbackModal";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CDPStackRouteProp } from "../../../../../../navigators/stacks/ExploreStack/DailyPracticeStack/CognitivePracticeStack/types";
import { showErrorBottomSheet } from "../../../../../../util/functions/bottomSheet";
import { EVENT_NAMES } from "../../../../../../stores/events/constants";
import { dispatchCustomEvent } from "../../../../../../util/functions/events";
import SyncLoader from "../../../../../../components/SyncLoader";
import ReframeWeather from "./components/ReframeWeather";

const Reframe = () => {
  const route = useRoute<CDPStackRouteProp<"ReframePractice">>();
  const { packContext, practiceActivity, from } = route.params || {};

  const navigation =
    useNavigation<CDPStackNavigationProp<keyof CDPStackParamList>>();
  const exploreNavigation =
    useNavigation<ExploreStackNavigationProp<keyof ExploreStackParamList>>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  // Reframe Thoughts = the "info" (blue) accent from the Cognitive Practice list;
  // the flow inherits it (Start, selection, save + done screens).
  const accentColor = colors.accent.info;
  const onAccentColor = colors.accentOn.info;
  const [selectedReframe, setSelectedReframe] = React.useState<string | null>(
    null,
  );
  const { updateActivity } = useActivityStore();
  const { practiceSession } = useSessionStore();
  const { user } = useUserStore();

  const [writtenReframe, setWrittenReframe] = React.useState<string>("");
  const [scenarios, setScenarios] = useState<ReframingThoughtScenarioData[]>(
    [],
  );
  const [selectedScenarioIndex, setSelectedScenarioIndex] = useState<number>(0);
  const [cognitivePracticeId, setCognitivePracticeId] = useState<string | null>(
    null,
  );
  const [isDone, setIsDone] = useState(false);
  const [currentActivityId, setCurrentActivityId] = useState<string | null>(
    practiceActivity?.id || null,
  );
  const [showVitalsModal, setShowVitalsModal] = useState(false);

  const onBackPress = () => {
    if (from === "MOOD_CHECK") {
      navigation.navigate("Root" as any, { screen: "HOME" });
    } else {
      navigation.goBack();
    }
  };

  const toggleIndex = () => {
    if (scenarios && scenarios.length > 0) {
      setSelectedScenarioIndex(
        (prevIndex) => (prevIndex + 1) % scenarios.length,
      );
      setSelectedReframe(null);
      setWrittenReframe("");
    }
  };

  const markActivityStart = useMarkActivityStart({
    contentType: PracticeActivityContentType.COGNITIVE_PRACTICE,
    contentId: cognitivePracticeId ?? undefined,
    initialActivity: practiceActivity,
    packContext,
    currentActivityId,
    setActivityId: setCurrentActivityId,
    navigation,
    logTag: "Reframe",
    // Reframe historically does not emit ACTIVITY_STARTED analytics.
    trackStart: false,
    // Caller branches on the thrown error (stamina upsell); preserve throw.
    rethrowErrors: true,
    onSessionError: () =>
      showErrorBottomSheet(
        "Session Error",
        "We couldn't initialize your practice session. Please try again.",
      ),
  });

  // --- Confirm-on-exit: prompt to save/discard if leaving mid-practice ---
  // Save opens the existing vitals modal (the normal completion path). isCompleted
  // includes showVitalsModal so an open vitals modal doesn't trigger a 2nd prompt.
  const { exitSheet } = useConfirmOnExit({
    navigation,
    activityId: currentActivityId,
    isCompleted: isDone || showVitalsModal,
    onSave: () => setShowVitalsModal(true),
    accentColor,
    family: "Cognitive",
    from,
    packContext,
  });

  const markActivityDone = async (vitals?: {
    effortScore: number;
    autonomyScore: number;
    accuracyScore?: number;
  }) => {
    console.log("markActivityDone [Reframe] called", {
      cognitivePracticeId,
      currentActivityId,
      userId: user?.id || practiceSession?.user?.id,
      vitals,
    });

    if (!cognitivePracticeId || !currentActivityId) {
      console.warn("Missing IDs for Reframe completion");
      return;
    }

    // Determine userId: try user store first (common), then session user
    const userId = user?.id || practiceSession?.user?.id;
    if (!userId) {
      console.warn(">> Reframe: Missing userId, cannot complete activity");
      return;
    }

    // If NOT in pack context, we must have a session
    const isPackContext = !!packContext?.packId;
    if (!isPackContext && !practiceSession) {
      console.warn("Missing session for non-pack Reframe completion");
      return;
    }

    try {
      console.log("Completing Reframe activity...", {
        currentActivityId,
        userId,
      });
      const completedActivity = await completePracticeActivity({
        id: currentActivityId,
        userId: userId,
        packId: packContext?.packId,
        moduleId: packContext?.moduleId,
        vitals,
      });

      console.log("Reframe Activity COMPLETED:", completedActivity);

      updateActivity(currentActivityId, {
        ...completedActivity,
      });
      useUserStore.getState().fetchUser();

      if (packContext) {
        // Use the parent Explore stack navigation to return to PackModule
        if (exploreNavigation.canGoBack()) {
          exploreNavigation.goBack();
        } else {
          exploreNavigation.navigate("PackModule", {
            packId: packContext.packId,
            moduleId: packContext.moduleId,
            initialBlockIndex: packContext.blockIndex,
          });
        }
      } else {
        setIsDone(true);
      }
    } catch (err) {
      console.error("Failed to complete activity", err);
      showErrorBottomSheet(
        "Save Failed",
        "We couldn't save your progress. Please try again.",
      );
      throw err;
    }
  };

  const handleVitalsSubmit = async (vitals?: {
    effortScore: number;
    autonomyScore: number;
    accuracyScore?: number;
  }) => {
    setShowVitalsModal(false);
    try {
      await markActivityDone(vitals);
    } catch (e) {
      console.error("Failed to submit vitals and complete activity", e);
    }
  };

  // Fetch all reframe scenarios once on mount
  useEffect(() => {
    const fetchScenarios = async () => {
      const rs = await getCognitivePracticeByType(
        CognitivePracticeType.REFRAMING_THOUGHTS,
      );

      const recommendedId = (route.params as any)?.id;
      let targetScenario = rs[0];
      if (recommendedId) {
        const found = rs.find(s => s.id === recommendedId);
        if (found) targetScenario = found;
      }

      setScenarios(targetScenario?.reframingThoughtsData?.scenarios || []);
      setCognitivePracticeId(targetScenario?.id || null);
    };
    fetchScenarios();
  }, []);

  if (isDone) {
    return (
      <DonePractice
        activityId={currentActivityId ?? undefined}
        contentType={PracticeActivityContentType.COGNITIVE_PRACTICE}
        practiceName="reframe practice"
        accentColor={accentColor}
        onAccentColor={onAccentColor}
        onDone={undefined}
        from={from}
      />
    );
  }

  const currentScenario = scenarios[selectedScenarioIndex];
  const started = !!currentActivityId;

  return (
    <View style={styles.root}>
      <SyncLoader />
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Ambient weather — moody rain that clears into warm light as a reframe is
          chosen. Sits behind the scrollable content. */}
      <ReframeWeather sunshine={!!(selectedReframe || writtenReframe.length > 0)} />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: insets.top + space.inlineGap,
            // Clears the floating-control slot (bottom 110 + 46 button + gap).
            paddingBottom: 180,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <PageHeader title="Reframe Thoughts" onBack={onBackPress} />

        <View style={styles.body}>
          {/* Eyebrow — Reframe's blue identity. Shuffle lives in the floating FAB. */}
          <Text variant="label" color={accentColor} style={styles.eyebrow}>
            REFRAME
          </Text>

          {/* Negative thought */}
          <View style={styles.negativeSection}>
            <View style={styles.negativeLabelRow}>
              <Icon name="cloud-rain" size={14} color={colors.text.tertiary} />
              <Text variant="label" color="tertiary">
                NEGATIVE THOUGHT
              </Text>
            </View>
            <Text variant="h2" color="primary" center style={styles.negativeText}>
              "{currentScenario?.negativeThought || "Loading..."}"
            </Text>
          </View>

          {/* Choose a better perspective */}
          <View style={styles.positiveSection}>
            <Text variant="label" color={accentColor} center style={styles.chooseLabel}>
              CHOOSE A BETTER PERSPECTIVE
            </Text>

            <View style={styles.optionsList}>
              {currentScenario?.reframedThoughts.map((item, index) => {
                const isSelected = selectedReframe === item;
                return (
                  <PressableScale
                    key={index}
                    onPress={() => setSelectedReframe(item)}
                    style={[
                      styles.optionCard,
                      {
                        backgroundColor: isSelected
                          ? colors.accentTint.info
                          : colors.surface.elevated,
                        borderColor: isSelected ? accentColor : colors.border.hairline,
                      },
                    ]}
                  >
                    <Text
                      variant="body"
                      color={isSelected ? colors.feedback.infoText : "secondary"}
                      center
                      style={styles.optionText}
                    >
                      {item}
                    </Text>
                  </PressableScale>
                );
              })}
            </View>

            {/* Write your own */}
            <View style={styles.writeOwnContainer}>
              <Text variant="bodySm" color="tertiary" center>
                Or write your own:
              </Text>
              <TextArea
                value={writtenReframe}
                onChangeText={setWrittenReframe}
                placeholder="I can handle this by..."
                numberOfLines={3}
                inputStyle={[styles.textAreaInput, { color: colors.text.primary }]}
                containerStyle={{
                  ...styles.textAreaWrapper,
                  backgroundColor: colors.surface.elevated,
                  borderColor: colors.border.hairline,
                }}
              />
            </View>

            {(selectedReframe || writtenReframe.length > 0) && (
              <Button
                label="Submit Reframe"
                onPress={() => setShowVitalsModal(true)}
                accentColor={accentColor}
                onAccentColor={onAccentColor}
                style={styles.submitButton}
              />
            )}
          </View>
        </View>
      </ScrollView>

      {/* Floating shuffle control — the canonical lower-right slot (same as the
          Community "+" and Library search). Cycles to a fresh thought to reframe. */}
      <FloatingControls
        items={[
          {
            icon: "refresh-cw",
            onPress: toggleIndex,
            accessibilityLabel: "Shuffle to a new thought",
            accentColor,
            onAccentColor,
          },
        ]}
      />

      {/* Soft dark cap so scrolled content fades out behind the status bar. */}
      {insets.top > 0 ? (
        <Gradient
          colors={["#10151F", "rgba(16,21,31,0)"]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={[styles.statusCap, { height: insets.top + spacing.sm }]}
          pointerEvents="none"
        />
      ) : null}

      {/* Start gate — dark scrim + card until the exercise begins. */}
      {!started && (
        <View
          style={[
            styles.startOverlay,
            {
              paddingTop: insets.top + 100,
              backgroundColor: colors.overlay.scrim,
            },
          ]}
        >
          <Surface
            level="elevated"
            rounded="card"
            padded={spacing["4xl"]}
            style={styles.startContent}
          >
            <Text variant="h2" color="primary" center>
              Ready to Shift Perspective?
            </Text>
            <Text variant="body" color="secondary" center style={styles.startDesc}>
              Learn to identify negative thoughts and replace them with
              empowering ones.
            </Text>
            <View style={styles.startButtons}>
              <Button
                label="Start Exercise"
                onPress={async () => {
                  if (!cognitivePracticeId) {
                    console.warn("Missing cognitivePracticeId in Reframe start");
                    return;
                  }
                  try {
                    await markActivityStart();
                  } catch (error: any) {
                    console.error("Error starting reframe practice:", error);
                    if (
                      error?.response?.data?.errorCode === "INSUFFICIENT_STAMINA" ||
                      error?.response?.status === 402
                    ) {
                      dispatchCustomEvent(EVENT_NAMES.SHOW_STAMINA_UPSELL);
                    } else {
                      showErrorBottomSheet(
                        "Failed to start",
                        "An error occurred while starting the session.",
                      );
                    }
                  }
                }}
                accentColor={accentColor}
                onAccentColor={onAccentColor}
              />
              <Button
                label="Go back"
                variant="ghost"
                onColor={accentColor}
                onPress={onBackPress}
              />
            </View>
          </Surface>
        </View>
      )}

      <VitalsFeedbackModal
        visible={showVitalsModal}
        onSkip={() => handleVitalsSubmit(undefined)}
        onSubmit={handleVitalsSubmit}
        accentColor={accentColor}
        onAccentColor={onAccentColor}
      />

      {exitSheet}
    </View>
  );
};

export default Reframe;

const styles = StyleSheet.create({
  root: { flex: 1 },

  scroll: {
    paddingHorizontal: space.screenX,
  },
  body: {
    marginTop: space.titleGap,
    gap: space.sectionGap,
  },
  statusCap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },

  // Header eyebrow
  eyebrow: {
    letterSpacing: 1.5,
  },

  // Negative thought
  negativeSection: {
    width: "100%",
    alignItems: "center",
    paddingVertical: spacing.md,
  },
  negativeLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.inlineGap,
    marginBottom: space.groupGap,
  },
  negativeText: {
    lineHeight: 38,
  },

  // Perspectives
  positiveSection: {
    width: "100%",
    gap: space.groupGap,
  },
  chooseLabel: {
    letterSpacing: 1.5,
  },
  optionsList: {
    gap: space.groupGap,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: space.sectionGap,
    borderRadius: radius.card,
    borderWidth: 1,
  },
  optionText: {
    flex: 1,
    lineHeight: 26,
  },
  writeOwnContainer: {
    marginTop: spacing.xl,
    gap: space.rowGap,
  },
  textAreaWrapper: {
    borderWidth: 1,
    borderRadius: radius.input,
    padding: space.inlineGap,
  },
  textAreaInput: {
    fontSize: 16,
    minHeight: 100,
    textAlign: "center",
  },
  submitButton: {
    marginTop: space.sectionGap,
  },

  // Start gate
  startOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
    justifyContent: "flex-start",
    alignItems: "center",
  },
  startContent: {
    alignItems: "center",
    gap: space.sectionGap,
    width: "85%",
  },
  startDesc: {
    lineHeight: 24,
  },
  startButtons: {
    width: "100%",
    gap: spacing.sm,
  },
});
