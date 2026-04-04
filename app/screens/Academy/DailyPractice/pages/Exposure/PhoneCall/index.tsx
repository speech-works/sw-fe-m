import { useNavigation, useRoute } from "@react-navigation/native";
import axios from "axios";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/FontAwesome5";
import { API_BASE_URL } from "../../../../../../api/constants";
import { getPhoneCallScenarios } from "../../../../../../api/dailyPractice";
import { PhoneCallScenario } from "../../../../../../api/dailyPractice/types";
import BottomSheetModal from "../../../../../../components/BottomSheetModal";
import CallingWidget from "../../../../../../components/CallingWidget";
import CustomScrollView from "../../../../../../components/CustomScrollView";
import {
  PhoneCallEDPStackNavigationProp,
  PhoneCallEDPStackParamList,
  PhoneCallEDPStackRouteProp,
} from "../../../../../../navigators/stacks/AcademyStack/DailyPracticeStack/ExposureStack/PhoneCallStack/types";
import { useUserStore } from "../../../../../../stores/user";
import { theme } from "../../../../../../Theme/tokens";
import { parseTextStyle } from "../../../../../../util/functions/parseStyles";
import { showErrorBottomSheet } from "../../../../../../util/functions/bottomSheet";
const RINGING_SOUND_FILE = require("../../../../../../assets/sounds/dial-tone_us.wav");

import {
  completePracticeActivity,
  createPracticeActivity,
  createPracticeActivityFromPack,
  startPracticeActivity,
} from "../../../../../../api";
import { PracticeActivityContentType } from "../../../../../../api/practiceActivities/types";
import { useActivityStore } from "../../../../../../stores/activity";
import { useSessionStore } from "../../../../../../stores/session";
import VitalsFeedbackModal from "../../../../../../components/VitalsFeedbackModal";
import DonePractice from "../../../components/DonePractice";

const PhoneCall = () => {
  const navigation =
    useNavigation<
      PhoneCallEDPStackNavigationProp<keyof PhoneCallEDPStackParamList>
    >();
  const { user } = useUserStore();
  const { practiceSession, setSession, ensureActiveSession } =
    useSessionStore();
  const { addActivity, updateActivity } = useActivityStore();
  const insets = useSafeAreaInsets();

  // Extract packContext from route params (if available) - requires casting as it might not be in the type def yet
  const route = useRoute<PhoneCallEDPStackRouteProp<"PhoneCallScreen">>();
  const { packContext, practiceActivity } = route.params || {};

  const [scenarioData, setScenarioData] = useState<PhoneCallScenario[]>([]); // Placeholder for scenario data
  // State for the currently selected scenario, initialized with the first item
  const [selectedScenario, setSelectedScenario] = useState<PhoneCallScenario>();
  const [currentActivityId, setCurrentActivityId] = useState<string | null>(
    practiceActivity?.id || null,
  );

  // State for bottom sheet visibility
  const [isDone, setIsDone] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [showVitalsModal, setShowVitalsModal] = useState(false);
  const closeModal = () => setIsModalVisible(false);

  const markActivityStart = async (): Promise<string | null> => {
    if (!selectedScenario) return null;
    const isPackContext = packContext?.packId;

    let sessionToUse = practiceSession;

    if (!isPackContext && !sessionToUse && user?.id) {
      try {
        sessionToUse = await ensureActiveSession(user.id);
        setSession(sessionToUse);
      } catch (err) {
        console.error("Failed to ensure active session", err);
        return null;
      }
    }

    // If not in a pack and no session, we can't track
    if (!isPackContext && !sessionToUse) return null;

    try {
      const sessionId = isPackContext ? undefined : sessionToUse!.id;
      const userId = user?.id;

      if (!userId) {
        console.error("Missing userId");
        return null;
      }

      if (packContext?.alreadyStarted && practiceActivity) {
        console.log(">> PhoneCall: Activity already started by Pack, syncing state...");
        addActivity({
          ...practiceActivity,
        });
        useUserStore.getState().fetchUser();
        setCurrentActivityId(practiceActivity.id);
        return practiceActivity.id;
      }

      let activityIdToStart = currentActivityId;

      // If we don't have a unique activity ID yet, create one (Standalone mode)
      if (!activityIdToStart) {
        if (isPackContext) {
          console.log("PhoneCall - Creating Activity via POST (Pack)");
          const newActivity = await createPracticeActivityFromPack({
            packId: packContext.packId,
            moduleId: packContext.moduleId,
            contentType: PracticeActivityContentType.EXPOSURE_PRACTICE,
            contentId: selectedScenario.id,
          });
          activityIdToStart = newActivity.id;
        } else {
          if (!sessionId) {
            console.error("No session ID for standalone activity");
            return null;
          }
          console.log("PhoneCall - Creating Activity via POST (Standalone)");
          let newActivity;
          try {
            newActivity = await createPracticeActivity({
              sessionId,
              contentType: PracticeActivityContentType.EXPOSURE_PRACTICE,
              contentId: selectedScenario.id,
            });
          } catch (createErr: any) {
            if (createErr?.response?.status === 404 && createErr?.response?.data?.error?.toLowerCase().includes("session")) {
              console.log(">> PhoneCall: Stale session detected (404), refreshing...");
              sessionToUse = await ensureActiveSession(userId, true);
              newActivity = await createPracticeActivity({
                sessionId: sessionToUse.id,
                contentType: PracticeActivityContentType.EXPOSURE_PRACTICE,
                contentId: selectedScenario.id,
              });
            } else {
              throw createErr;
            }
          }
          activityIdToStart = newActivity.id;
        }
      }

      const startedActivity = await startPracticeActivity({
        id: activityIdToStart,
        userId,
      });

      addActivity({
        ...startedActivity,
      });
      setCurrentActivityId(activityIdToStart);
      useUserStore.getState().fetchUser();
      return activityIdToStart;
    } catch (error) {
      console.error("Failed to start phone call activity", error);
      return null;
    }
  };

  const markActivityComplete = async (vitals?: {
    effortScore: number;
    autonomyScore: number;
    accuracyScore?: number;
  }) => {
    if (!currentActivityId) return;
    const userId = user?.id; // Always use real ID from store if available

    if (!userId) return;

    try {
      const completedActivity = await completePracticeActivity({
        id: currentActivityId,
        userId,
        packId: packContext?.packId,
        moduleId: packContext?.moduleId,
        vitals,
      });

      updateActivity(currentActivityId, {
        ...completedActivity,
      });
      useUserStore.getState().fetchUser();

      // Clear the local activity ID state so starting another call creates a new one
      setCurrentActivityId(null);
      setIsDone(true);
    } catch (error) {
      console.error("Failed to complete phone call activity", error);
    }
  };

  const handleCallEnd = () => {
    if (!currentActivityId) return;
    setShowVitalsModal(true);
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
        if (data.length > 0) {
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

  if (isDone) {
    return (
      <DonePractice
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
      />
    );
  }

  return (
    <>
      <View style={styles.container}>
        <LinearGradient
          colors={["#020617", "#1e1b4b", "#2e1065"] as const} // Deep Slate -> Indigo -> Violet
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />

        {/* Safe Area Top Layout */}
        <View
          style={[
            styles.topHeader,
            { paddingTop: insets.top + (Platform.OS === "android" ? 12 : 10) },
          ]}
        >
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButtonGlass}
          >
            <Icon name="chevron-left" size={14} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerTextContainer}
            onPress={() => setIsModalVisible(true)}
          >
            <Text style={styles.headerTitleModern}>AI Conversation</Text>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              <Text style={styles.headerSubtitleModern}>
                {selectedScenario?.name || "Select Scenario"}
              </Text>
              <Icon
                name="caret-down"
                size={12}
                color="rgba(255,255,255,0.7)"
                style={{ marginTop: 4 }}
              />
            </View>
          </TouchableOpacity>
          {/* Placeholder for settings/tips or balance */}
          <View style={{ width: 40 }} />
        </View>

        {/* Main Calling UI Place */}
        <View style={styles.mainContent}>
          <CallingWidget
            key={selectedScenario?.id}
            userId={user?.id || ""}
            websocketUrl={API_BASE_URL.replace(/^http/, "ws")}
            scenarioId={selectedScenario?.id}
            scenarioIcon={selectedScenario?.phoneCallData?.icon || "robot"}
            agentName={selectedScenario?.phoneCallData?.agentName || "AI Agent"}
            agentDesignation={
              selectedScenario?.phoneCallData?.agentDesignation || "Assistant"
            }
            ringtoneAsset={RINGING_SOUND_FILE}
            onCallStart={markActivityStart}
            onCallEnd={handleCallEnd}
          />
        </View>
      </View>

      <BottomSheetModal
        visible={isModalVisible}
        onClose={closeModal}
        maxHeight="80%"
        showCloseButton={true}
        fitContent={true}
      >
        <LinearGradient
          colors={["#0f172a", "#1e1b4b", "#2e1065"] as const}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{ flex: 1, width: "100%" }}
        >
          <View
            style={[
              styles.modalContent,
              { paddingBottom: Math.max(insets.bottom, 24) },
            ]}
          >
            <View style={styles.modalTitleContainer}>
              <Text style={styles.modalTitleText}>Practice Scenarios</Text>
              <Text style={styles.modalDescText}>
                Select a scenario to practice
              </Text>
            </View>

            <CustomScrollView
              style={styles.modalScrollView}
              nestedScrollEnabled={true}
              contentContainerStyle={styles.modalScrollContainer}
            >
              {scenarioData.map((scenario, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.scenarioCard,
                    selectedScenario?.id === scenario.id &&
                      styles.selectedScenarioCard,
                  ]}
                  onPress={() => {
                    setSelectedScenario(scenario);
                    closeModal();
                  }}
                >
                  <View style={styles.scenarioIconContainer}>
                    <Icon
                      solid
                      name={scenario.phoneCallData?.icon || "robot"}
                      size={24}
                      color={theme.colors.actionPrimary.default}
                    />
                  </View>
                  <View style={styles.scenarioDescContainer}>
                    <Text
                      style={[
                        styles.scenarioNameText,
                        selectedScenario?.id === scenario.id &&
                          styles.selectedCardText,
                      ]}
                    >
                      {scenario.name}
                    </Text>
                    <Text
                      style={[
                        styles.scenarioDetailText,
                        selectedScenario?.id === scenario.id &&
                          styles.selectedCardText,
                      ]}
                    >
                      {scenario.description}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </CustomScrollView>
          </View>
        </LinearGradient>
      </BottomSheetModal>

      <VitalsFeedbackModal
        visible={showVitalsModal}
        onSkip={() => handleVitalsSubmit(undefined)}
        onSubmit={handleVitalsSubmit}
      />
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
    paddingHorizontal: 20,
    // paddingTop handled dynamically
    paddingBottom: 20,
    zIndex: 10,
  },
  backButtonGlass: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.1)", // Glass effect
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  headerTextContainer: {
    alignItems: "center",
  },
  headerTitleModern: {
    fontFamily: "Outfit-Medium", // Assuming font exists, based on other files
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  headerSubtitleModern: {
    fontFamily: "Outfit-Bold",
    color: "#FFFFFF",
    fontSize: 16,
    marginTop: 4,
  },
  mainContent: {
    flex: 1,
    position: "relative",
  },

  // Modal Styles (kept largely same)
  // Modal Styles (Updated for Futuristic Theme)
  modalContent: {
    paddingVertical: 24,
    width: "100%",
    flex: 1,
    flexDirection: "column",
    gap: 32,
    backgroundColor: "#0f172a", // Fallback
  },
  modalTitleContainer: {
    gap: 12,
    alignItems: "center",
  },
  modalTitleText: {
    ...parseTextStyle(theme.typography.Heading3),
    color: "#FFFFFF",
    fontSize: 22,
    letterSpacing: 1,
  },
  modalDescText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: "rgba(255,255,255,0.6)",
  },
  modalScrollView: {
    flex: 1,
    padding: 4,
  },
  modalScrollContainer: {
    gap: 16,
    alignItems: "center",
    paddingBottom: 32,
    paddingHorizontal: 16,
  },
  scenarioCard: {
    width: "100%",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    backgroundColor: "rgba(255,255,255,0.05)", // Glass effect
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  selectedScenarioCard: {
    backgroundColor: "rgba(56, 189, 248, 0.15)", // Sky blue tint
    borderColor: theme.colors.actionPrimary.default,
  },
  selectedCardText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  scenarioIconContainer: {
    height: 44,
    width: 44,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  scenarioDescContainer: {
    gap: 4,
    flexShrink: 1,
  },
  scenarioNameText: {
    ...parseTextStyle(theme.typography.Body),
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
  },
  scenarioDetailText: {
    ...parseTextStyle(theme.typography.BodyDetails),
    color: "rgba(255,255,255,0.5)",
  },
});
