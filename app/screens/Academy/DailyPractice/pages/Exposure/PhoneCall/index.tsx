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
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
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
import PressableScale from "../../../../../../components/PressableScale";
import WalletChip from "../../../../../../components/WalletChip";
import ExhaustionSheet from "../../../../../../components/ExhaustionSheet";
import {
  PhoneCallEDPStackNavigationProp,
  PhoneCallEDPStackParamList,
  PhoneCallEDPStackRouteProp,
} from "../../../../../../navigators/stacks/ExploreStack/DailyPracticeStack/ExposureStack/PhoneCallStack/types";
import { useUserStore } from "../../../../../../stores/user";
import { useAICallConsentStore } from "../../../../../../stores/aiCallConsent";
import AICallConsentModal from "../../../../../../components/AICallConsentModal";
import { postAiCallConsent } from "../../../../../../api/users";
import {
  Text,
  Icon,
  IconButton,
  icons,
  Sheet,
  useTheme,
  spacing,
  radius,
  size as controlSize,
  duration,
  easing,
  useNavBarInset,
} from "../../../../../../design-system";
import {
  showErrorBottomSheet,
  showSuccessBottomSheet,
} from "../../../../../../util/functions/bottomSheet";
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
  const navBarInset = useNavBarInset();
  /** Shared by the header row and the label absolutely centred inside it. */
  const headerPaddingTop = insets.top + (Platform.OS === "android" ? 12 : 10);
  const { colors } = useTheme();
  // Phone Call = the "purple" accent from the Exposure hub card.
  const accentColor = colors.accent.purple;
  // Colored foreground (the scenario icon) needs the per-scheme legible cut, not
  // the bright fill base which collapses to ~2:1 on the light canvas.
  const accentFg = colors.accentText.purple;
  const onAccentColor = colors.accentOn.purple;

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

  // Local mark keeps the offline/first-run gate working; the server POST is
  // best-effort so a reinstall/re-login doesn't re-prompt someone who already
  // consented (production-readiness pass, WS5).
  const handleAiCallConsentAcknowledge = () => {
    markAICallConsented();
    postAiCallConsent().catch(() => {});
  };

  // Consent is affirmative-only: declining (backdrop tap, back, or "Not now")
  // must NOT record consent and must take the user out of the AI-call flow —
  // no consent, no call (production-readiness hardening).
  // Close first, leave once it has gone. See `onDismissed` on the modal.
  const handleAiCallConsentDecline = () => setConsentDeclined(true);

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
  /** A purchase landed — show the confirmation once the sheet has gone. */
  const purchaseLandedRef = useRef(false);

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
  const [showExhaustionSheet, setShowExhaustionSheet] = useState(false);
  /** Declined the AI-call disclosure — leave, but only once the sheet is gone. */
  const [consentDeclined, setConsentDeclined] = useState(false);
  const [walletRefreshKey, setWalletRefreshKey] = useState(0);
  const closeModal = () => setIsModalVisible(false);

  /**
   * IS A CALL ACTUALLY ON THE LINE?
   *
   * Not `currentActivityId` — that is already set on arrival when a pack hands
   * this screen a pre-created activity, so it says "live" before anybody has
   * pressed call. This flips on a start that really returned an id, and off in
   * `handleCallEnd`, which the widget fires from one shared cleanup for EVERY
   * termination (hang-up, limit, idle, crisis, technical).
   *
   * It gates the scenario picker, and that is not cosmetic: `CallingWidget` is
   * keyed on the scenario id, so picking a different one mid-call remounted the
   * widget and killed the call — after a credit had been spent on it.
   */
  const [callLive, setCallLive] = useState(false);
  const reduceMotion = useReducedMotion();
  const liveT = useSharedValue(0);

  useEffect(() => {
    liveT.value = withTiming(callLive ? 1 : 0, {
      // Exit faster than enter: the affordance should get out of the way the
      // moment the call connects, and come back gently once it is over.
      duration: callLive ? duration.sheetOut : duration.reveal,
      easing: callLive ? easing.in : easing.out,
    });
  }, [callLive, liveT]);

  /** The chevron is the only part that leaves — fading opacity, never width,
   *  so the label beside it cannot shift when a call starts or ends. */
  const chevronStyle = useAnimatedStyle(() => ({
    opacity: 1 - liveT.value,
    transform: reduceMotion ? [] : [{ translateY: liveT.value * 4 }],
  }));

  const openScenarioPicker = () => setIsModalVisible(true);

  /**
   * BACK MUST CLOSE AN OPEN SHEET, NOT NAVIGATE PAST IT.
   *
   * A sheet is a native Modal. Navigating while one is on screen leaves it
   * presented over the screen you moved to — transparent, on top of
   * everything, swallowing every touch. The app looks fine and answers
   * nothing, which is exactly what somebody hit here: out of calls, sheet
   * opens, tap back because there is nothing else to do, dead app.
   *
   * The Sheet's own docs warn about this. The fix is the ordinary modal
   * contract: the first back press dismisses what is open, the second leaves.
   */
  const handleHeaderBack = () => {
    if (showExhaustionSheet) {
      setShowExhaustionSheet(false);
      return;
    }
    if (isModalVisible) {
      setIsModalVisible(false);
      return;
    }
    if (from === "MOOD_CHECK") {
      navigation.navigate("Root" as any, { screen: "HOME" });
    } else {
      navigation.goBack();
    }
  };

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
    // Rethrow so handleCallStart below can tell a 402 NO_CREDITS apart from
    // any other start failure and show the right UI for each.
    rethrowErrors: true,
    // This screen answers a refused start itself (the top-up sheet), so the
    // generic dialog must not also fire — see the flag's note.
    suppressErrorModal: true,
  });

  // Calls are the one activity type gated on call credits (SPEECHWORKS-STRATEGY.md
  // §6.2, PAYMENTS-PLAN.md). A 402 here means the wallet's out of credits and
  // the weekly free taster is on cooldown — show the top-up sheet instead of
  // the generic error toast.
  const handleCallStart = async (): Promise<string | null> => {
    try {
      const startedId = await markActivityStart();
      // Only a start that produced an id is a call — a null here means the
      // widget never dialled, and the picker must stay available.
      setCallLive(startedId !== null);
      return startedId;
    } catch (error) {
      setCallLive(false);
      if (
        axios.isAxiosError(error) &&
        error.response?.status === 402 &&
        error.response?.data?.errorCode === "NO_CREDITS"
      ) {
        setShowExhaustionSheet(true);
        return null;
      }
      console.error("[PhoneCall] Failed to start activity", error);
      showErrorBottomSheet(
        "Try Later",
        "Something went wrong starting the call. Please try again.",
      );
      return null;
    }
  };

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
    // Every termination lands here, including the ones that return early below.
    // The line is down the moment this fires, so release the picker first.
    setCallLive(false);

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
    accentColor,
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
        accentColor={accentColor}
        onAccentColor={onAccentColor}
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
        <View style={[styles.topHeader, { paddingTop: headerPaddingTop }]}>
          <IconButton name="arrow-left" onPress={handleHeaderBack} />
          <WalletChip refreshKey={walletRefreshKey} />
          {/*
            Centred on the SCREEN, not on the gap between two controls of
            unequal width — the wallet chip grows with the credit count, so a
            row-centred label drifts left as the number changes. Absolute and
            inert: it is a label, and the only control up here is back.
          */}
          <View
            pointerEvents="none"
            style={[styles.headerLabelSlot, { top: headerPaddingTop }]}
          >
            <Text
              variant="label"
              color="tertiary"
              numberOfLines={1}
              style={styles.headerEyebrow}
            >
              AI CONVERSATION
            </Text>
          </View>
        </View>

        {/* Main Calling UI Place */}
        {/* CallingWidget deliberately owns no safe-area logic — FirstCall's
            <Screen edges={["top","bottom"]}> pads it there, and this screen pads
            it here. Applying it in both places would double-pad. 0 on iOS. */}
        <View style={[styles.mainContent, { paddingBottom: navBarInset }]}>
          <CallingWidget
            // Keyed so a scenario change resets the widget cleanly. That makes
            // the picker DESTRUCTIVE mid-call — remounting hangs up a call the
            // user has already paid a credit for — which is why the pull-tab
            // below is disabled while `callLive`. Do not un-gate it.
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
            onCallStart={handleCallStart}
            onCallEnd={handleCallEnd}
            onCallEndAcknowledged={handleCallEndAcknowledged}
          />
        </View>

        {/*
          THE SCENARIO PULL-TAB.

          The picker used to hang off the header title under a chevron pointing
          DOWN, at a sheet that rises from the bottom. This puts the control at
          the edge the sheet actually comes from, within thumb reach, and points
          the chevron the way the sheet travels.

          It never unmounts. During a call it stops being a control and becomes
          a plain label — the chevron fades, the name stays — so the scenario is
          still readable mid-call and nothing in the layout moves either way.
        */}
        <View
          style={[
            styles.tabDock,
            // Clear of the home indicator / gesture bar; a floor for devices
            // that report no bottom inset at all.
            { paddingBottom: Math.max(insets.bottom, spacing.md) },
          ]}
        >
          <PressableScale
            onPress={openScenarioPicker}
            disabled={callLive}
            haptic={false}
            hitSlop={{
              top: spacing.md,
              bottom: spacing.sm,
              left: spacing.xl,
              right: spacing.xl,
            }}
            accessibilityRole="button"
            accessibilityLabel={
              selectedScenario
                ? `Scenario: ${selectedScenario.name}`
                : "Choose a scenario"
            }
            accessibilityHint={
              callLive ? undefined : "Opens the list of practice scenarios"
            }
            accessibilityState={{ disabled: callLive, expanded: isModalVisible }}
            style={[
              styles.tab,
              {
                backgroundColor: colors.surface.default,
                borderColor: colors.border.hairline,
              },
            ]}
          >
            <Text
              variant="bodySm"
              color="secondary"
              numberOfLines={1}
              style={styles.tabLabel}
            >
              {selectedScenario?.name || "Choose a scenario"}
            </Text>
            <Animated.View style={chevronStyle}>
              <Icon
                name={icons.chevronUp}
                size={14}
                color={colors.text.tertiary}
              />
            </Animated.View>
          </PressableScale>
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
                          ? colors.accentTint.purple
                          : colors.surface.default,
                        borderColor: isSelected
                          ? accentColor
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
                        color={accentFg}
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
        accentColor={accentColor}
        onAccentColor={onAccentColor}
      />

      <AICallConsentModal
        visible={
          consentHydrated &&
          !aiConsented &&
          !user?.aiCallConsentAt &&
          !consentDeclined
        }
        onAcknowledge={handleAiCallConsentAcknowledge}
        onDecline={handleAiCallConsentDecline}
        onDismissed={() => {
          if (consentDeclined && navigation.canGoBack()) navigation.goBack();
        }}
      />

      <ExhaustionSheet
        visible={showExhaustionSheet}
        onClose={() => setShowExhaustionSheet(false)}
        onResolved={() => {
          // Close ONLY. The confirmation is a native modal of its own, and
          // firing it here would stack it on a sheet still animating out —
          // the same freeze the back button used to cause.
          purchaseLandedRef.current = true;
          setShowExhaustionSheet(false);
          setWalletRefreshKey((k) => k + 1);
        }}
        onDismissed={() => {
          if (!purchaseLandedRef.current) return;
          purchaseLandedRef.current = false;
          showSuccessBottomSheet(
            "You're all set",
            "Tap the call button again to start.",
          );
        }}
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
  // Sits on the control row's own centreline: same height as the back button,
  // so the label is optically level with it rather than pinned to the top.
  headerLabelSlot: {
    position: "absolute",
    left: 0,
    right: 0,
    height: controlSize.backBtn,
    alignItems: "center",
    justifyContent: "center",
  },
  headerEyebrow: {
    letterSpacing: 1,
  },
  mainContent: {
    flex: 1,
    position: "relative",
  },

  // --- Scenario pull-tab (bottom edge) ---
  tabDock: {
    alignItems: "center",
    paddingHorizontal: spacing.xl,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    // 8 + ~18 line + 8 = ~34pt tall; hitSlop above takes the touch target past
    // the 44pt minimum without making the tab itself look like a button bar.
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.full,
    borderWidth: 1,
    maxWidth: "100%",
  },
  tabLabel: {
    // Long scenario names ellipsise instead of pushing the chevron off the pill.
    flexShrink: 1,
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
