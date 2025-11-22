import { StyleSheet, View } from "react-native";
import React, { useCallback, useEffect } from "react";
import { useFocusEffect } from "@react-navigation/native";
import ScreenView from "../../components/ScreenView";
import MoodCheck from "./components/MoodCheck";
import Progress from "./components/Progress";
import DailyPractice from "./components/DailyPractice";
import Tiles from "./components/Tiles";
import CustomScrollView from "../../components/CustomScrollView";
import { useUserStore } from "../../stores/user";
import { createSession, getAllSessionsOfUser } from "../../api";
import { useSessionStore } from "../../stores/session";
import { useMoodCheckStore } from "../../stores/mood";
import { getUserStats } from "../../api/stats";
import { usePracticeStatsStore } from "../../stores/practiceStats";
import ResourceStats from "./components/ResourceStats";
import usePullToRefresh from "../../hooks/usePullToRefresh";
import BuyPro from "../Settings/components/BuyPro";
import { useEventStore } from "../../stores/events";
import { EVENT_NAMES } from "../../stores/events/constants";
import OnboardingReminderCard from "../../components/OnboardingReminderCard";
import { useOnboardingStore } from "../../stores/onboarding";
import { getActiveOnboardingFlow } from "../../api/onboarding";

const Academy = () => {
  const { user } = useUserStore();
  const { practiceSession, setSession, clearSession } = useSessionStore();
  const { setPracticeStats } = usePracticeStatsStore();
  const { hasRecordedToday, lastRecordedDate } = useMoodCheckStore();

  const emit = useEventStore((s) => s.emit);

  // --- NEW: Get onboarding state properties ---
  const currentOnboardingScreen = useOnboardingStore((s) => s.currentScreen);
  const onboardingFlow = useOnboardingStore((s) => s.flow);
  const getTotalScreens = useOnboardingStore((s) => s.getTotalScreens);

  // Calculate total screens safely. If no flow loads, default to 1 to avoid div by zero errors in UI.
  const totalOnboardingScreens = onboardingFlow ? getTotalScreens() : 1;
  // --------------------------------------------

  const syncSessionWithBackend = useCallback(async () => {
    if (!user) {
      if (practiceSession) {
        console.log("Sync: No user, clearing local session.");
        clearSession();
      }
      return;
    }

    console.log("Attempting to sync session with backend...");
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
          console.log(
            "Sync: Setting session from backend:",
            backendOngoingSession
          );
          setSession(backendOngoingSession);
        } else {
          console.log("Sync: Local ongoing session matches backend.");
        }
      } else {
        if (practiceSession && practiceSession.status === "ONGOING") {
          console.log(
            "Sync: Backend reports no ongoing session. Clearing local ongoing session."
          );
          clearSession();
        } else {
          console.log(
            "Sync: No ongoing session on backend, local state consistent or already clear."
          );
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
      console.log("practice stats after refresh-", { practiceStats });
      setPracticeStats(practiceStats);
    }
  }, [syncSessionWithBackend, user?.id, setPracticeStats]);

  const { refreshControl, refreshing } = usePullToRefresh(handleScreenRefresh);

  useFocusEffect(
    React.useCallback(() => {
      console.log(
        "Academy screen focused or dependencies changed, triggering sync."
      );
      syncSessionWithBackend();
    }, [syncSessionWithBackend])
  );

  const startNewSession = async () => {
    if (!user) {
      console.log("Cannot start session: User not available.");
      return;
    }
    try {
      console.log("Attempting to create new session...");
      const newSessionData = await createSession({ userId: user.id });
      if (newSessionData) {
        console.log("New session created and set:", newSessionData);
        setSession(newSessionData);
      } else {
        console.error(
          "Failed to create session: No session data returned from API."
        );
      }
    } catch (error) {
      console.error("Failed to create new session:", error);
    }
  };

  useEffect(() => {
    console.log("lastRecordedDate", { lastRecordedDate, hasRecordedToday });
  }, [lastRecordedDate, hasRecordedToday]);

  useEffect(() => {
    if (!user) return;
    const fetchUserStats = async () => {
      const practiceStats = await getUserStats(user.id);
      console.log("practice stats-", { practiceStats });
      setPracticeStats(practiceStats);
    };
    fetchUserStats();
  }, [user, setPracticeStats]);

  useEffect(() => {
    console.log("Refreshing Academy screen useeffect:", { refreshing });
  }, [refreshing]);

  return (
    <ScreenView style={styles.screenView}>
      <CustomScrollView refreshControl={refreshControl}>
        <View style={styles.innerContainer}>
          {/* ⭐ SHOW REMINDER IF USER HAS NOT COMPLETED ONBOARDING */}
          {user && !user.hasCompletedOnboarding && (
            <OnboardingReminderCard
              // --- NEW: PASS PROGRESS PROPS ---
              currentStep={currentOnboardingScreen - 1}
              totalSteps={totalOnboardingScreens}
              // --------------------------------
              onPress={async () => {
                try {
                  const state = useOnboardingStore.getState();

                  // Check if we have a persisted flow and progress to resume
                  if (state.flow && state.currentScreen > 1) {
                    console.log("Resuming existing onboarding flow...");
                    // Do not fetch. Do not reset. Just open.
                    emit(EVENT_NAMES.START_ONBOARDING);
                    return;
                  }

                  // Otherwise, load fresh
                  console.log("Starting fresh onboarding flow...");
                  const flow = await getActiveOnboardingFlow();

                  // Use the action that resets to screen 1
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
});
