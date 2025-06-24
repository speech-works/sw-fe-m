import { StyleSheet, View } from "react-native";
import React, { useCallback } from "react"; // Removed useEffect for now, will use useFocusEffect
import { useFocusEffect } from "@react-navigation/native"; // Ensure this is installed and setup
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

const Academy = () => {
  const { user } = useUserStore();
  const { practiceSession, setSession, clearSession } = useSessionStore();
  const { hasRecordedToday } = useMoodCheckStore();
  // This function contains the core synchronization logic.
  // It's memoized by useCallback. Its dependencies dictate when its *identity* changes.
  const syncSessionWithBackend = useCallback(async () => {
    // We use 'user' and 'practiceSession' from the outer scope,
    // which are captured by this useCallback.
    // If 'user' or 'practiceSession' changes, this useCallback will provide a new function instance.
    if (!user) {
      if (practiceSession) {
        // If there was a session locally but user is gone
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
        // Backend has an ongoing session. Update local if different or not marked ONGOING.
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
        // Backend has NO ongoing session. If local still thinks one is ongoing, clear it.
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
      // Consider how to handle errors: maybe clear session or set an error state.
    }
  }, [user, practiceSession, setSession]); // Dependencies of the sync logic itself

  // useFocusEffect runs when the screen is focused, and also when its dependency array changes.
  useFocusEffect(
    useCallback(() => {
      // This inner callback is for useFocusEffect.
      // We call syncSessionWithBackend here.
      // syncSessionWithBackend's identity changes if user, practiceSession, or setSession changes.
      console.log(
        "Academy screen focused or dependencies changed, triggering sync."
      );
      syncSessionWithBackend();

      // No cleanup needed for this specific sync logic
      // return () => { console.log("Academy screen blurred or dependencies changed for cleanup"); };
    }, [syncSessionWithBackend]) // The dependency here is the memoized syncSessionWithBackend function.
  );

  const startNewSession = async () => {
    if (!user) {
      console.log("Cannot start session: User not available.");
      return;
    }
    // // Check local state first. The sync logic should keep 'practiceSession' up-to-date.
    // if (practiceSession && practiceSession.status === "ONGOING") {
    //   console.log(
    //     "Cannot start new session: A session is already ongoing locally."
    //   );
    //   // Optionally, you could force a sync here if you suspect local state might be stale despite useFocusEffect
    //   // await syncSessionWithBackend();
    //   // if (useSessionStore.getState().practiceSession?.status === "ONGOING") return;
    //   return;
    // }

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

  return (
    <ScreenView style={styles.screenView}>
      <CustomScrollView>
        <View style={styles.innerContainer}>
          {hasRecordedToday && <MoodCheck />}
          <Progress />
          <DailyPractice onClickStart={startNewSession} />
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
