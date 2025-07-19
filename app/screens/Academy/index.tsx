import { StyleSheet, View } from "react-native";
import React, { useCallback, useEffect } from "react";
import { useFocusEffect } from "@react-navigation/native";
import ScreenView from "../../components/ScreenView";
import MoodCheck from "./components/MoodCheck";
import Progress from "./components/Progress";
import DailyPractice from "./components/DailyPractice";
import Tiles from "./components/Tiles";
import CustomScrollView from "../../components/CustomScrollView"; // Re-introducing CustomScrollView
import { useUserStore } from "../../stores/user";
import { createSession, getAllSessionsOfUser } from "../../api";
import { useSessionStore } from "../../stores/session";
import { useMoodCheckStore } from "../../stores/mood";
import { getUserStats } from "../../api/stats";
import { usePracticeStatsStore } from "../../stores/practiceStats";
import ResourceStats from "./components/ResourceStats";
import usePullToRefresh from "../../hooks/usePullToRefresh";

const Academy = () => {
  const { user } = useUserStore();
  const { practiceSession, setSession, clearSession } = useSessionStore();
  const { setPracticeStats } = usePracticeStatsStore();
  const { hasRecordedToday, lastRecordedDate } = useMoodCheckStore();

  // This function contains the core synchronization logic.
  // It's memoized by useCallback. Its dependencies dictate when its *identity* changes.
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

  // This function now contains the actual refresh logic for the screen
  const handleScreenRefresh = useCallback(async () => {
    // Re-call your core synchronization and data fetching functions
    await syncSessionWithBackend(); // Ensure this runs during pull-to-refresh
    if (user?.id) {
      const practiceStats = await getUserStats(user.id);
      console.log("practice stats after refresh-", { practiceStats });
      setPracticeStats(practiceStats);
    }
  }, [syncSessionWithBackend, user?.id, setPracticeStats]); // Ensure dependencies are correct

  const { refreshControl, refreshing } = usePullToRefresh(handleScreenRefresh);

  // useFocusEffect runs when the screen is focused, and also when its dependency array changes.
  useFocusEffect(
    useCallback(() => {
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
  }, [user, setPracticeStats]); // Added setPracticeStats to dependencies

  // Original useEffect that was being queried about
  useEffect(() => {
    console.log("Refreshing Academy screen useeffect:", { refreshing });
  }, [refreshing]);

  return (
    <ScreenView style={styles.screenView}>
      <CustomScrollView refreshControl={refreshControl}>
        <View style={styles.innerContainer}>
          {!hasRecordedToday && <MoodCheck />}
          <ResourceStats refreshing={refreshing} />
          {/* ResourceStats will hide during refresh */}
          <Progress />
          {!refreshing && <DailyPractice onClickStart={startNewSession} />}
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
