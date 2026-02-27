import { StyleSheet, View, Text } from "react-native";
import React, { useCallback, useState, useEffect } from "react";
import { LinearGradient } from "expo-linear-gradient"; // Added useEffect import
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import ScreenView from "../../components/ScreenView";
import CustomScrollView from "../../components/CustomScrollView";
import { theme } from "../../Theme/tokens";
import { parseTextStyle } from "../../util/functions/parseStyles";
import WorldExplorationGraph from "./components/WorldExplorationGraph";
import PracticeGrid from "./components/PracticeGrid";
import LibrarySection from "./components/LibrarySection";
import BuyPro from "../Settings/components/BuyPro";
import { useUserStore } from "../../stores/user";
import { useSessionStore } from "../../stores/session";
import { usePracticeStatsStore } from "../../stores/practiceStats"; // Added missing import
import { useEventStore } from "../../stores/events"; // Added missing import
import { getUserStats } from "../../api/stats";
import { createSession, getAllSessionsOfUser } from "../../api";
import usePullToRefresh from "../../hooks/usePullToRefresh";
import { EVENT_NAMES } from "../../stores/events/constants"; // Added missing import
import BottomSheetModal from "../../components/BottomSheetModal";
import BgPattern_404 from "../../assets/sw-bg/BgPattern_404";
import ErrorFace from "../../assets/sw-faces/ErrorFace";

const Explore = () => {
  const { user } = useUserStore();
  const { practiceSession, setSession, clearSession } = useSessionStore();
  const { setPracticeStats } = usePracticeStatsStore();
  const { emit, events, clear } = useEventStore();

  // --- NEW: Local State for Error Modal ---
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorTitle, setErrorTitle] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  // ----------------------------------------

  // --- NEW: Scroll State for pausing animations ---
  const [isScrolling, setIsScrolling] = useState(false);
  let scrollTimeout: NodeJS.Timeout | null = null;
  // ----------------------------------------

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

  const { refreshControl } = usePullToRefresh(handleScreenRefresh); // Removed refreshing since not used directly in new layout

  // --- Listen for Modal Events ---
  useEffect(() => {
    if (!events || events.length === 0) return;

    for (const event of events) {
      if (event.name === EVENT_NAMES.SHOW_ERROR_MODAL) {
        setErrorTitle(event.detail.modalTitle || "Something went wrong");
        setErrorMessage(
          event.detail.errorMessage || "An unexpected error occurred.",
        );
        setErrorModalVisible(true);
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
    <View style={styles.screenView}>
      {/* Background Mesh/Gradient */}
      <View style={StyleSheet.absoluteFillObject}>
        {/* We use a multi-stop gradient for a 'Mesh' feel */}
        <LinearGradient
          colors={["#FFF7ED", "#FFF", "#FFF"]} // Peach -> White
          locations={[0, 0.4, 1]}
          style={{ flex: 1 }}
        />
      </View>

      <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
        <CustomScrollView
          refreshControl={refreshControl}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          onScrollBeginDrag={() => setIsScrolling(true)}
          onMomentumScrollBegin={() => setIsScrolling(true)}
          onScrollEndDrag={(e: any) => {
            // Check for momentum relying on velocity
            const hasMomentum =
              e.nativeEvent?.velocity &&
              Math.abs(e.nativeEvent.velocity.y) > 0.1;
            if (!hasMomentum) {
              setIsScrolling(false);
            }
          }}
          onMomentumScrollEnd={() => setIsScrolling(false)}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Explore</Text>
            <Text style={styles.subtitle}>
              Discover new ways to improve your speech.
            </Text>
          </View>

          <View style={styles.innerContainer}>
            {/* World Exploration Map */}
            <WorldExplorationGraph />

            {/* 4 Types of Practice Grid */}
            <PracticeGrid isScrolling={isScrolling} />

            {/* Upgrade CTA */}
            <BuyPro />

            {/* Inline Library Section */}
            <LibrarySection />
          </View>
        </CustomScrollView>
      </SafeAreaView>

      {/* Error Modal */}
      <BottomSheetModal
        visible={errorModalVisible}
        onClose={() => setErrorModalVisible(false)}
        maxHeight="40%"
      >
        <BgPattern_404 />
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{errorTitle}</Text>
          <Text style={styles.modalMessage}>{errorMessage}</Text>
          <ErrorFace size={152} />
        </View>
      </BottomSheetModal>
    </View>
  );
};

export default Explore;

const styles = StyleSheet.create({
  screenView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 130, // Space for Custom Tab Bar
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 24,
  },
  header: {
    gap: 8,
  },
  innerContainer: {
    gap: 32,
    flex: 1,
  },
  title: {
    ...parseTextStyle(theme.typography.Heading2),
    color: theme.colors.text.title,
  },
  subtitle: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
  },
  // Modal Styles
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
});
