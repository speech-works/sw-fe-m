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
import ScreenView from "../../../../../../components/ScreenView";
import PressableScale from "../../../../../../components/PressableScale";
import TextArea from "../../../../../../components/TextArea";
import {
  Button,
  Surface,
  Text,
  Icon,
  IconButton,
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
import RainOverlay from "./components/RainOverlay";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CDPStackRouteProp } from "../../../../../../navigators/stacks/ExploreStack/DailyPracticeStack/CognitivePracticeStack/types";
import { showErrorBottomSheet } from "../../../../../../util/functions/bottomSheet";
import { EVENT_NAMES } from "../../../../../../stores/events/constants";
import { dispatchCustomEvent } from "../../../../../../util/functions/events";
import SyncLoader from "../../../../../../components/SyncLoader";

const Reframe = () => {
  const route = useRoute<CDPStackRouteProp<"ReframePractice">>();
  const { packContext, practiceActivity, from } = route.params || {};

  const navigation =
    useNavigation<CDPStackNavigationProp<keyof CDPStackParamList>>();
  const exploreNavigation =
    useNavigation<ExploreStackNavigationProp<keyof ExploreStackParamList>>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
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
        onDone={undefined}
        from={from}
      />
    );
  }

  const currentScenario = scenarios[selectedScenarioIndex];
  const started = !!currentActivityId;

  return (
    <ScreenView style={styles.screenView}>
      {/* Dark canvas + light status-bar glyphs (dark scaffold reference). */}
      <View
        style={[
          StyleSheet.absoluteFillObject,
          { backgroundColor: colors.background.canvas },
        ]}
      />
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <SyncLoader />

      {/* Dark back bar */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + space.inlineGap,
            backgroundColor: colors.background.canvas,
          },
        ]}
      >
        <IconButton name="arrow-left" onPress={onBackPress} />
        <Text variant="h3" color="primary">
          Reframe Thoughts
        </Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: space.screenX,
          paddingTop: insets.top + 76,
          paddingBottom: insets.bottom + spacing["5xl"],
        }}
        showsVerticalScrollIndicator={false}
      >
        <Surface level="default" rounded="card" style={styles.cardContainer}>
          {/* 1. Solid plum header hosting the rain/sunshine overlay. */}
          <View
            style={[
              styles.cardHeader,
              { backgroundColor: colors.category.mirror },
            ]}
          >
            {/* Rain/Sunshine Animation (preserved) - Behind everything */}
            <RainOverlay
              showSunshine={!!(selectedReframe || writtenReframe.length > 0)}
            />

            {/* Watermark - Behind buttons */}
            <View style={styles.headerWatermark}>
              <Icon name="cloud" size={96} color={colors.categoryOn.mirror} />
            </View>

            {/* Buttons - On top with higher z-index */}
            <View style={styles.headerTopRow}>
              <View
                style={[
                  styles.categoryPill,
                  { backgroundColor: colors.categoryOn.mirror },
                ]}
              >
                <Icon name="wind" size={12} color={colors.category.mirror} />
                <Text variant="caption" color={colors.category.mirror} style={styles.categoryPillText}>
                  REFRAME
                </Text>
              </View>

              {/* Shuffle Button */}
              <PressableScale
                onPress={toggleIndex}
                style={[
                  styles.glassButton,
                  { backgroundColor: colors.categoryOn.mirror },
                ]}
              >
                <Text variant="bodySm" color={colors.category.mirror}>
                  Shuffle
                </Text>
                <Icon name="shuffle" size={12} color={colors.category.mirror} />
              </PressableScale>
            </View>
          </View>

          {/* 2. Card body content */}
          <View style={styles.cardBody}>
            {/* Content (Blurred or Visible based on state) */}
            <View style={{ opacity: started ? 1 : 0.3, width: "100%" }}>
              {/* Negative Thought Section */}
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

              {/* Divider - Minimalist Space */}
              <View style={styles.dividerContainer} />

              {/* Reframe Options */}
              <View style={styles.positiveSection}>
                <View style={styles.positiveLabelRow}>
                  <Text variant="label" color="link" center>
                    CHOOSE A BETTER PERSPECTIVE
                  </Text>
                </View>

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
                              ? colors.action.primaryTint
                              : colors.surface.elevated,
                            borderColor: isSelected
                              ? colors.border.selected
                              : colors.border.hairline,
                          },
                        ]}
                      >
                        <Text
                          variant="body"
                          color={isSelected ? "link" : "secondary"}
                          center
                          style={styles.optionText}
                        >
                          {item}
                        </Text>
                      </PressableScale>
                    );
                  })}
                </View>

                {/* Write Your Own */}
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
                    style={{ marginTop: space.sectionGap }}
                  />
                )}
              </View>
            </View>
          </View>
        </Surface>
      </ScrollView>

      {/* Start Overlay if not started - dark scrim + card */}
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
          <Surface level="elevated" rounded="card" padded={spacing["4xl"]} style={styles.startContent}>
            <Text variant="h2" color="primary" center>
              Ready to Shift Perspective?
            </Text>
            <Text variant="body" color="secondary" center style={styles.startDesc}>
              Learn to identify negative thoughts and replace them with
              empowering ones.
            </Text>
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
                  if (error?.response?.data?.errorCode === "INSUFFICIENT_STAMINA" || error?.response?.status === 402) {
                    dispatchCustomEvent(EVENT_NAMES.SHOW_STAMINA_UPSELL);
                  } else {
                    showErrorBottomSheet("Failed to start", "An error occurred while starting the session.");
                  }
                }
              }}
              style={styles.startButton}
            />
          </Surface>
        </View>
      )}

      <VitalsFeedbackModal
        visible={showVitalsModal}
        onSkip={() => handleVitalsSubmit(undefined)}
        onSubmit={handleVitalsSubmit}
      />

      {exitSheet}
    </ScreenView>
  );
};

export default Reframe;

const styles = StyleSheet.create({
  screenView: {
    flex: 1,
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 30,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: space.screenX,
    paddingBottom: space.inlineGap,
  },

  // Card
  cardContainer: {
    overflow: "hidden",
    minHeight: 650,
  },
  cardHeader: {
    padding: space.sectionGap,
    paddingBottom: spacing["5xl"], // Space for overlap
    position: "relative",
    height: 160,
    overflow: "hidden", // Clip rain/sun animation to header bounds
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 10, // Above rain/sunshine animation
    position: "relative",
  },
  categoryPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: space.rowGap,
    paddingVertical: 6,
    borderRadius: radius.chip,
  },
  categoryPillText: {
    letterSpacing: 1.5,
  },
  glassButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.inlineGap,
    paddingHorizontal: 14,
    paddingVertical: space.inlineGap,
    borderRadius: radius.chip,
  },
  headerWatermark: {
    position: "absolute",
    right: -20,
    bottom: -20,
    opacity: 0.15,
    transform: [{ rotate: "-15deg" }],
  },
  cardBody: {
    marginTop: -40, // Overlap
    paddingHorizontal: space.sectionGap,
    paddingBottom: spacing["4xl"],
    minHeight: 500,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
  },

  // Start Overlay
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
  startButton: {
    width: "100%",
  },

  // Content Sections
  negativeSection: {
    width: "100%",
    paddingHorizontal: space.rowGap,
    marginTop: spacing["3xl"],
    marginBottom: space.sectionGap,
    alignItems: "center",
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
  dividerContainer: {
    height: space.groupGap,
    width: "100%",
  },
  positiveSection: {
    width: "100%",
    gap: space.groupGap,
  },
  positiveLabelRow: {
    marginBottom: space.rowGap,
    alignItems: "center",
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
    marginTop: spacing["3xl"],
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
});
