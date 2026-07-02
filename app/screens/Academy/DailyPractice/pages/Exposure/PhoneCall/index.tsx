import { useNavigation, useRoute } from "@react-navigation/native";
import axios from "axios";
import React, { useEffect, useRef, useState } from "react";
import {
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
// Server-driven scenario glyphs are FontAwesome names (e.g. "robot"), matching
// how the shared CallingWidget renders the same value — a scoped vendor-icon
// exception, not part of the Fluent DS set.
import FA5Icon from "react-native-vector-icons/FontAwesome5";
import { WS_BASE_URL } from "../../../../../../api/constants";
import { getPhoneCallScenarios } from "../../../../../../api/dailyPractice";
import {
  ExposurePracticeType,
  PhoneCallScenario,
} from "../../../../../../api/dailyPractice/types";
import CallingWidget from "../../../../../../components/CallingWidget";
import {
  PhoneCallEDPStackNavigationProp,
  PhoneCallEDPStackParamList,
  PhoneCallEDPStackRouteProp,
} from "../../../../../../navigators/stacks/ExploreStack/DailyPracticeStack/ExposureStack/PhoneCallStack/types";
import { useUserStore } from "../../../../../../stores/user";
import { useAICallConsentStore } from "../../../../../../stores/aiCallConsent";
import AICallConsentModal from "../../../../../../components/AICallConsentModal";
import {
  Text,
  Icon,
  IconButton,
  icons,
  Sheet,
  useTheme,
  spacing,
  radius,
} from "../../../../../../design-system";
import { showErrorBottomSheet } from "../../../../../../util/functions/bottomSheet";
import { useMarkActivityStart } from "../../../../../../hooks/useMarkActivityStart";
const RINGING_SOUND_FILE = require("../../../../../../assets/sounds/dial-tone_us.wav");

import {
  abortPracticeActivity,
  completePracticeActivity,
} from "../../../../../../api";
import { PracticeActivityContentType } from "../../../../../../api/practiceActivities/types";
import { useActivityStore } from "../../../../../../stores/activity";

import VitalsFeedbackModal from "../../../../../../components/VitalsFeedbackModal";
import { useConfirmOnExit } from "../../../../../../hooks/useConfirmOnExit";
import DonePractice from "../../../components/DonePractice";
import PhoneCallReport from "./Report";

const PhoneCall = () => {
  const navigation =
    useNavigation<
      PhoneCallEDPStackNavigationProp<keyof PhoneCallEDPStackParamList>
    >();
  const { user } = useUserStore();
  const { updateActivity } = useActivityStore();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  // One-time disclosure before the first AI conversation (voice is streamed to
  // a third-party AI partner). Hydration-guarded to avoid a flash for users who
  // have already acknowledged it.
  const aiConsented = useAICallConsentStore((s) => s.consented);
  const markAICallConsented = useAICallConsentStore((s) => s.markConsented);
  const [consentHydrated, setConsentHydrated] = useState(
    useAICallConsentStore.persist.hasHydrated(),
  );
  useEffect(() => {
    const unsub = useAICallConsentStore.persist.onFinishHydration(() =>
      setConsentHydrated(true),
    );
    return unsub;
  }, []);

  // Extract packContext from route params (if available) - requires casting as it might not be in the type def yet
  const route = useRoute<PhoneCallEDPStackRouteProp<"PhoneCallScreen">>();
  const { packContext, practiceActivity, from } = (route.params as any) || {};

  const [scenarioData, setScenarioData] = useState<PhoneCallScenario[]>([]); // Placeholder for scenario data
  // State for the currently selected scenario, initialized with activity data if coming from a pack
  const [selectedScenario, setSelectedScenario] = useState<
    PhoneCallScenario | undefined
  >(() => {
    const ep = practiceActivity?.exposurePractice;
    if (ep?.type === ExposurePracticeType.PHONE_CALL_SIMULATION && ep.phoneCallData) {
      return {
        id: ep.id,
        name: ep.name,
        description: ep.description,
        difficulty: ep.difficulty,
        type: ExposurePracticeType.PHONE_CALL_SIMULATION,
        phoneCallData: ep.phoneCallData,
      } as PhoneCallScenario;
    }
    return undefined;
  });
  const [currentActivityId, setCurrentActivityId] = useState<string | null>(
    practiceActivity?.id || null,
  );
  const currentActivityIdRef = useRef<string | null>(
    practiceActivity?.id || null,
  );

  const setTrackedActivityId = (activityId: string | null) => {
    currentActivityIdRef.current = activityId;
    setCurrentActivityId(activityId);
  };

  // State for bottom sheet visibility
  const [isDone, setIsDone] = useState(false);
  const [reportActivityId, setReportActivityId] = useState<string | null>(null);
  const [reportDismissed, setReportDismissed] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [showVitalsModal, setShowVitalsModal] = useState(false);
  const closeModal = () => setIsModalVisible(false);

  const markActivityStart = useMarkActivityStart({
    contentType: PracticeActivityContentType.EXPOSURE_PRACTICE,
    contentId: selectedScenario?.id,
    contentTitle: selectedScenario?.name,
    initialActivity: practiceActivity,
    packContext,
    currentActivityId,
    setActivityId: setTrackedActivityId,
    navigation,
    logTag: "PhoneCall",
  });

  const markActivityComplete = async (vitals?: {
    effortScore: number;
    autonomyScore: number;
    accuracyScore?: number;
  }): Promise<boolean> => {
    const activityId = currentActivityIdRef.current || currentActivityId;
    if (!activityId) return false;
    const userId = user?.id; // Always use real ID from store if available

    if (!userId) return false;

    try {
      const completedActivity = await completePracticeActivity({
        id: activityId,
        userId,
        packId: packContext?.packId,
        moduleId: packContext?.moduleId,
        vitals,
      });

      updateActivity(activityId, {
        ...completedActivity,
      });
      useUserStore.getState().fetchUser();

      // Capture the id for the post-call report before we clear it below.
      setReportActivityId(activityId);
      // Clear the local activity ID state so starting another call creates a new one
      setTrackedActivityId(null);
      setIsDone(true);
      return true;
    } catch (error) {
      console.error("Failed to complete phone call activity", error);
      return false;
    }
  };

  const abortCurrentActivity = async (refundResources: boolean) => {
    const activityId = currentActivityIdRef.current || currentActivityId;
    if (!activityId) return;
    const userId = user?.id;

    if (!userId) {
      setTrackedActivityId(null);
      return;
    }

    try {
      const abortedActivity = await abortPracticeActivity({
        id: activityId,
        userId,
        packId: packContext?.packId,
        moduleId: packContext?.moduleId,
        refundResources,
      });
      updateActivity(activityId, {
        ...abortedActivity,
      });
    } catch (error) {
      console.error("Failed to abort phone call activity", error);
    } finally {
      useUserStore.getState().fetchUser();
      setTrackedActivityId(null);
    }
  };

  const handleCallEnd = async ({
    shouldComplete,
    reason,
  }: {
    shouldComplete: boolean;
    reason: string | null;
  }) => {
    if (reason === "limit_reached") {
      return;
    }

    if (!currentActivityIdRef.current && !currentActivityId) return;

    if (shouldComplete) {
      setShowVitalsModal(true);
      return;
    }

    await abortCurrentActivity(
      reason === "technical_difficulty" || reason === null,
    );
  };

  const handleCallEndAcknowledged = async ({
    reason,
  }: {
    reason: string | null;
  }) => {
    if (reason !== "limit_reached") {
      return;
    }

    const didComplete = await markActivityComplete();
    if (!didComplete) {
      throw new Error("Failed to complete phone call activity");
    }
  };

  const handleVitalsSubmit = async (vitals?: {
    effortScore: number;
    autonomyScore: number;
    accuracyScore?: number;
  }) => {
    setShowVitalsModal(false);
    await markActivityComplete(vitals);
  };

  useEffect(() => {
    const fetchScenarios = async () => {
      try {
        const data = await getPhoneCallScenarios();
 
        setScenarioData(data);
        if (data.length > 0 && !selectedScenario) {
          setSelectedScenario(data[0]);
        }
      } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
          showErrorBottomSheet(
            "Try Later",
            error.response.data.error ||
              "An error occurred while fetching call scenarios.",
          );
        }
      }
    };
    fetchScenarios();
  }, []);

  // --- Confirm-on-exit: prompt to save/discard if leaving mid-practice ---
  // During a live call, "Save & Finish" completes directly (which flips isDone
  // and unmounts CallingWidget, ending the call) — we deliberately do NOT open
  // the vitals modal over a live call. Discard navigates away (no refund).
  const { exitSheet } = useConfirmOnExit({
    navigation,
    activityId: currentActivityId,
    isCompleted: isDone || showVitalsModal,
    onSave: () => {
      markActivityComplete();
    },
    family: "Exposure",
    from,
    packContext,
  });

  if (isDone) {
    if (reportActivityId && !reportDismissed) {
      return (
        <PhoneCallReport
          practiceActivityId={reportActivityId}
          onContinue={() => setReportDismissed(true)}
        />
      );
    }
    return (
      <DonePractice
        activityId={currentActivityId ?? undefined}
        contentType={PracticeActivityContentType.EXPOSURE_PRACTICE}
        practiceName="AI conversation"
        onDone={
          packContext
            ? () => {
                if (navigation.canGoBack()) {
                  navigation.goBack();
                } else {
                  navigation.navigate("PackModule", {
                    packId: packContext.packId,
                    moduleId: packContext.moduleId,
                    initialBlockIndex: packContext.blockIndex,
                  });
                }
              }
            : undefined
        }
        from={from}
      />
    );
  }

  return (
    <>
      <View
        style={[
          styles.container,
          { backgroundColor: colors.background.canvas },
        ]}
      >
        {/* Safe Area Top Layout */}
        <View
          style={[
            styles.topHeader,
            { paddingTop: insets.top + (Platform.OS === "android" ? 12 : 10) },
          ]}
        >
          <IconButton
            name="arrow-left"
            onPress={() =>
              from === "MOOD_CHECK"
                ? navigation.navigate("Root" as any, { screen: "HOME" })
                : navigation.goBack()
            }
          />
          <TouchableOpacity
            style={styles.headerTextContainer}
            onPress={() => setIsModalVisible(true)}
          >
            <Text variant="label" color="tertiary" style={styles.headerEyebrow}>
              AI CONVERSATION
            </Text>
            <View style={styles.headerTitleRow}>
              <Text variant="title" color="primary">
                {selectedScenario?.name || "Select Scenario"}
              </Text>
              <Icon
                name={icons.chevronDown}
                size={14}
                color={colors.text.secondary}
              />
            </View>
          </TouchableOpacity>
          {/* Placeholder for settings/tips or balance */}
          <View style={{ width: 44 }} />
        </View>

        {/* Main Calling UI Place */}
        <View style={styles.mainContent}>
          <CallingWidget
            key={selectedScenario?.id}
            userId={user?.id || ""}
            websocketUrl={WS_BASE_URL || ""}
            scenarioId={selectedScenario?.id}
            scenarioIcon={selectedScenario?.phoneCallData?.icon || "robot"}
            agentName={selectedScenario?.phoneCallData?.agentName || "AI Agent"}
            agentDesignation={
              selectedScenario?.phoneCallData?.agentDesignation || "Assistant"
            }
            ringtoneAsset={RINGING_SOUND_FILE}
            onCallStart={markActivityStart}
            onCallEnd={handleCallEnd}
            onCallEndAcknowledged={handleCallEndAcknowledged}
          />
        </View>
      </View>

      <Sheet visible={isModalVisible} onClose={closeModal}>
        <View style={styles.modalTitleContainer}>
          <Text variant="h2" center>
            Practice Scenarios
          </Text>
          <Text variant="bodySm" color="secondary" center>
            Select a scenario to practice
          </Text>
        </View>

        <View style={styles.scenarioList}>
              {scenarioData.map((scenario, index) => {
                const isSelected = selectedScenario?.id === scenario.id;
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.scenarioCard,
                      {
                        backgroundColor: isSelected
                          ? colors.action.primaryTint
                          : colors.surface.default,
                        borderColor: isSelected
                          ? colors.border.selected
                          : colors.border.hairline,
                      },
                    ]}
                    onPress={() => {
                      setSelectedScenario(scenario);
                      closeModal();
                    }}
                  >
                    <View
                      style={[
                        styles.scenarioIconContainer,
                        { backgroundColor: colors.surface.control },
                      ]}
                    >
                      <FA5Icon
                        solid
                        name={scenario.phoneCallData?.icon || "robot"}
                        size={24}
                        color={colors.action.primary}
                      />
                    </View>
                    <View style={styles.scenarioDescContainer}>
                      <Text variant="title" color="primary">
                        {scenario.name}
                      </Text>
                      <Text
                        variant="bodySm"
                        color="secondary"
                        style={styles.scenarioDetailText}
                      >
                        {scenario.description}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
        </View>
      </Sheet>

      <VitalsFeedbackModal
        visible={showVitalsModal}
        onSkip={() => handleVitalsSubmit(undefined)}
        onSubmit={handleVitalsSubmit}
      />

      <AICallConsentModal
        visible={consentHydrated && !aiConsented}
        onAcknowledge={markAICallConsented}
      />

      {exitSheet}
    </>
  );
};

export default PhoneCall;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    // paddingTop handled dynamically
    paddingBottom: spacing.xl,
    zIndex: 10,
  },
  headerTextContainer: {
    alignItems: "center",
  },
  headerEyebrow: {
    letterSpacing: 1,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.xxs,
  },
  mainContent: {
    flex: 1,
    position: "relative",
  },

  // Scenario picker sheet (dark canvas)
  modalTitleContainer: {
    gap: spacing.md,
    alignItems: "center",
  },
  scenarioList: {
    gap: spacing.lg,
    marginTop: spacing.xl,
  },
  scenarioCard: {
    width: "100%",
    borderRadius: radius.chip,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    borderWidth: 1,
  },
  scenarioIconContainer: {
    height: 44,
    width: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
  },
  scenarioDescContainer: {
    gap: spacing.xs,
    flexShrink: 1,
  },
  scenarioDetailText: {
    marginTop: spacing.xxs,
  },
});
