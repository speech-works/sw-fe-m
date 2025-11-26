import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import React, { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";

// Components
import ScreenView from "../../components/ScreenView";
import MoodCheck from "./components/MoodCheck";
import Progress from "./components/Progress";
import DailyPractice from "./components/DailyPractice";
import Tiles from "./components/Tiles";
import CustomScrollView from "../../components/CustomScrollView";
import ResourceStats from "./components/ResourceStats";
import BuyPro from "../Settings/components/BuyPro";
import OnboardingReminderCard from "../../components/OnboardingReminderCard";
import BottomSheetModal from "../../components/BottomSheetModal"; // <--- IMPORT THIS

// Stores & API
import { useUserStore } from "../../stores/user";
import { createSession, getAllSessionsOfUser } from "../../api";
import { useSessionStore } from "../../stores/session";
import { useMoodCheckStore } from "../../stores/mood";
import { getUserStats } from "../../api/stats";
import { usePracticeStatsStore } from "../../stores/practiceStats";
import { useEventStore } from "../../stores/events";
import { EVENT_NAMES } from "../../stores/events/constants";
import { useOnboardingStore } from "../../stores/onboarding";
import { getActiveOnboardingFlow } from "../../api/onboarding";
import usePullToRefresh from "../../hooks/usePullToRefresh";

// Theme & Styles
import { theme } from "../../Theme/tokens";
import { parseTextStyle } from "../../util/functions/parseStyles";
import ErrorFace from "../../assets/sw-faces/ErrorFace";
import BgPattern_404 from "../../assets/sw-bg/BgPattern_404";

const Academy = () => {
  const { user } = useUserStore();
  const { practiceSession, setSession, clearSession } = useSessionStore();
  const { setPracticeStats } = usePracticeStatsStore();
  const { hasRecordedToday, lastRecordedDate } = useMoodCheckStore();
  const { emit, events, clear } = useEventStore();

  // --- NEW: Local State for Error Modal ---
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorTitle, setErrorTitle] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  // ----------------------------------------

  const currentOnboardingScreen = useOnboardingStore((s) => s.currentScreen);
  const onboardingFlow = useOnboardingStore((s) => s.flow);
  const getTotalScreens = useOnboardingStore((s) => s.getTotalScreens);
  const totalOnboardingScreens = onboardingFlow ? getTotalScreens() : 1;

  const syncSessionWithBackend = useCallback(async () => {
    if (!user) {
      if (practiceSession) {
        clearSession();
      }
      return;
    }
    try {
      const activeSessions = await getAllSessionsOfUser({
        userId: user.id,
        sessionStatus: "ONGOING",
      });
      const backendOngoingSession = activeSessions?.[0];

      if (backendOngoingSession) {
        if (
          practiceSession?.id !== backendOngoingSession.id ||
          practiceSession?.status !== "ONGOING"
        ) {
          setSession(backendOngoingSession);
        }
      } else {
        if (practiceSession && practiceSession.status === "ONGOING") {
          clearSession();
        }
      }
    } catch (error) {
      console.error("Failed to sync session with backend:", error);
    }
  }, [user, practiceSession, setSession, clearSession]);

  const handleScreenRefresh = useCallback(async () => {
    await syncSessionWithBackend();
    if (user?.id) {
      const practiceStats = await getUserStats(user.id);
      setPracticeStats(practiceStats);
    }
  }, [syncSessionWithBackend, user?.id, setPracticeStats]);

  const { refreshControl, refreshing } = usePullToRefresh(handleScreenRefresh);

  useFocusEffect(
    React.useCallback(() => {
      syncSessionWithBackend();
    }, [syncSessionWithBackend])
  );

  const startNewSession = async () => {
    if (!user) return;
    try {
      const newSessionData = await createSession({ userId: user.id });
      if (newSessionData) {
        setSession(newSessionData);
      }
    } catch (error) {
      console.error("Failed to create new session:", error);
    }
  };

  // --- UPDATED: Listen for Modal Events ---
  useEffect(() => {
    if (!events || events.length === 0) return;

    for (const event of events) {
      if (event.name === EVENT_NAMES.SHOW_ERROR_MODAL) {
        console.log("→ Error modal triggering via Event Store...");

        // 1. Set the content
        setErrorTitle(event.detail.modalTitle || "Something went wrong");
        setErrorMessage(
          event.detail.errorMessage || "An unexpected error occurred."
        );

        // 2. Open the modal
        setErrorModalVisible(true);

        // 3. Clear the event so it doesn't fire again
        clear(EVENT_NAMES.SHOW_ERROR_MODAL);
      }
    }
  }, [events, clear]);

  useEffect(() => {
    if (!user) return;
    const fetchUserStats = async () => {
      const practiceStats = await getUserStats(user.id);
      setPracticeStats(practiceStats);
    };
    fetchUserStats();
  }, [user, setPracticeStats]);

  return (
    <ScreenView style={styles.screenView}>
      <CustomScrollView refreshControl={refreshControl}>
        <View style={styles.innerContainer}>
          {user && !user.hasCompletedOnboarding && (
            <OnboardingReminderCard
              currentStep={currentOnboardingScreen - 1}
              totalSteps={totalOnboardingScreens}
              onPress={async () => {
                try {
                  const state = useOnboardingStore.getState();
                  if (state.flow && state.currentScreen > 1) {
                    emit(EVENT_NAMES.START_ONBOARDING);
                    return;
                  }
                  const flow = await getActiveOnboardingFlow();
                  state.startFresh(flow);
                  emit(EVENT_NAMES.START_ONBOARDING);
                } catch (err) {
                  console.error("Failed to load onboarding flow:", err);
                }
              }}
            />
          )}
          {!hasRecordedToday && <MoodCheck />}

          <ResourceStats refreshing={refreshing} />

          <Progress />
          {!refreshing && <DailyPractice onClickStart={startNewSession} />}

          <BuyPro />
          <Tiles />
        </View>
      </CustomScrollView>

      {/* --- NEW: Error Modal Implementation --- */}
      <BottomSheetModal
        visible={errorModalVisible}
        onClose={() => setErrorModalVisible(false)}
        maxHeight="40%" // Adjust height preference
      >
        <BgPattern_404 />
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{errorTitle}</Text>
          <Text style={styles.modalMessage}>{errorMessage}</Text>
          <ErrorFace size={152} />
        </View>
      </BottomSheetModal>
      {/* --------------------------------------- */}
    </ScreenView>
  );
};

export default Academy;

const styles = StyleSheet.create({
  screenView: {
    paddingBottom: 0,
  },
  innerContainer: {
    gap: 32,
    flex: 1,
  },
  // --- New Modal Styles ---
  modalContent: {
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    gap: 16,
  },
  modalTitle: {
    color: theme.colors.text.title,
    ...parseTextStyle(theme.typography.Heading3),
    textAlign: "center",
  },
  modalMessage: {
    color: theme.colors.text.default,
    ...parseTextStyle(theme.typography.Body),
    textAlign: "center",
    lineHeight: 22,
  },
  closeButton: {
    marginTop: 8,
    backgroundColor: theme.colors.surface.default, // Light gray/neutral
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
  },
  closeButtonText: {
    color: theme.colors.text.default,
    ...parseTextStyle(theme.typography.BodySmall),
    fontWeight: "600",
  },
});
