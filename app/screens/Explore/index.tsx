import { LinearGradient } from "expo-linear-gradient";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  InteractionManager,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getAllSessionsOfUser } from "../../api";
import { getUserStats } from "../../api/stats";
import BgPattern_404 from "../../assets/sw-bg/BgPattern_404";
import ErrorFace from "../../assets/sw-faces/ErrorFace";
import BottomSheetModal from "../../components/BottomSheetModal";
import ScreenView from "../../components/ScreenView";
import usePullToRefresh from "../../hooks/usePullToRefresh";
import { useEventStore } from "../../stores/events"; // Added missing import
import { EVENT_NAMES } from "../../stores/events/constants"; // Added missing import
import { usePracticeStatsStore } from "../../stores/practiceStats"; // Added missing import
import { useSessionStore } from "../../stores/session";
import { useUserStore } from "../../stores/user";
import { theme } from "../../Theme/tokens";
import { parseTextStyle } from "../../util/functions/parseStyles";
import BuyPro from "../Settings/components/BuyPro";
import LibrarySection from "./components/LibrarySection";
import PracticeGrid from "./components/PracticeGrid";
import WorldExplorationGraph from "./components/WorldExplorationGraph";
import { TourGuideZone } from "rn-tourguide";
import { useAppTour } from "../../hooks/useAppTour";
import { useTourStore } from "../../stores/tour";

const Explore = () => {
  const { user } = useUserStore();
  const { practiceSession, setSession, clearSession } = useSessionStore();
  const { setPracticeStats } = usePracticeStatsStore();
  const { events, clear } = useEventStore();

  // --- NEW: Local State for Error Modal ---
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorTitle, setErrorTitle] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  // ----------------------------------------

  const [interactionsDone, setInteractionsDone] = useState(false);
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      setInteractionsDone(true);
    });
    return () => task.cancel();
  }, []);

  const verticalScrollRef = useRef<ScrollView>(null);
  const zoneLayouts = useRef<{ [key: number]: any }>({});
  const [isTourReady, setIsTourReady] = useState(false);
  const { hasCompletedHomeTour, hasCompletedExploreTour } = useTourStore();

  const captureLayout = (order: number) => (event: any) => {
    const { x, y, width, height } = event.nativeEvent.layout;
    if (width > 0 && height > 0) {
      // In flattened layout, y is directly absolute to ScrollView content
      zoneLayouts.current[order] = { x, y, width, height };
      if (order === 1) {
        setIsTourReady(true);
      }
    }
  };

  const {
    isActive: isTourActive,
    start,
    getCurrentStep,
  } = useAppTour(
    "explore",
    { vertical: verticalScrollRef },
    zoneLayouts,
    hasCompletedHomeTour && isTourReady && interactionsDone,
  );

  // Show a full-screen loader to block interaction until tour initializes
  // Visible if user hasn't finished Explore tour AND tour isn't active yet (measuring/settling)
  const shouldShowTourBlocker =
    hasCompletedHomeTour && !hasCompletedExploreTour && !isTourActive;

  // --- NEW: Scroll State for pausing animations ---
  const [isScrolling, setIsScrolling] = useState(false);
  // ----------------------------------------

  // Memoize heavy children so they don't re-render on isScrolling changes
  const memoizedWorldGraph = useMemo(() => <WorldExplorationGraph />, []);
  const memoizedBuyPro = useMemo(() => <BuyPro />, []);
  const memoizedLibrary = useMemo(() => <LibrarySection />, []);

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
    // Suppress popups if tour is active or blocker is showing
    if (isTourActive || shouldShowTourBlocker) return;

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
  }, [events, clear, isTourActive, shouldShowTourBlocker]);

  useEffect(() => {
    if (!user) return;
    const fetchUserStats = async () => {
      const practiceStats = await getUserStats(user.id);
      setPracticeStats(practiceStats);
    };
    fetchUserStats();
  }, [user?.id, setPracticeStats]);

  return (
    <ScreenView style={styles.screenView}>
      {/* Background Mesh/Gradient */}
      <View style={StyleSheet.absoluteFillObject}>
        {/* We use a multi-stop gradient for a 'Mesh' feel */}
        <LinearGradient
          colors={["#FFF7ED", "#FFF", "#FFF"]} // Peach -> White
          locations={[0, 0.4, 1]}
          style={{ flex: 1 }}
        />
      </View>

      <View style={{ flex: 1 }}>
        <ScrollView
          ref={verticalScrollRef}
          refreshControl={refreshControl}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!isTourActive}
          onScrollBeginDrag={() => setIsScrolling(true)}
          onMomentumScrollBegin={() => setIsScrolling(true)}
          onScrollEndDrag={(e: any) => {
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

          {/* World Exploration Map */}
          <View onLayout={captureLayout(1)} collapsable={false}>
            <TourGuideZone
              zone={1}
              text="Your Journey Map: Visualize your weekly practice rhythm and see how you explore different areas of speech improvement."
              shape="rectangle"
            >
              <WorldExplorationGraph onLayoutCapture={() => {}} />
            </TourGuideZone>
          </View>

          {/* 4 Types of Practice Grid */}
          <View onLayout={captureLayout(2)} collapsable={false}>
            <TourGuideZone
              zone={2}
              text="Practice Zones: Choose from Story, Social, Interview, or Daily challenges to target specific speech goals."
              shape="rectangle"
            >
              <View collapsable={false}>
                <PracticeGrid isScrolling={isScrolling} />
              </View>
            </TourGuideZone>
          </View>

          {/* Upgrade CTA */}
          <BuyPro onLayoutCapture={() => {}} />

          {/* Inline Library Section */}
          <View onLayout={captureLayout(3)} collapsable={false}>
            <TourGuideZone
              zone={3}
              text="Tutorial Library: Deepen your knowledge with our curated video collection on speech techniques and mindset."
              shape="rectangle"
            >
              <LibrarySection onLayoutCapture={() => {}} />
            </TourGuideZone>
          </View>

          {/* Spacer for tour deep-scrolling */}
          {isTourActive && <View style={{ height: 600 }} />}
        </ScrollView>
      </View>

      {/* Error Modal */}
      <BottomSheetModal
        visible={errorModalVisible}
        onClose={() => setErrorModalVisible(false)}
        maxHeight="40%"
        showCloseButton={true}
      >
        <BgPattern_404 />
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{errorTitle}</Text>
          <Text style={styles.modalMessage}>{errorMessage}</Text>
          <ErrorFace size={152} />
        </View>
      </BottomSheetModal>

      {/* Tour Blocker Overlay - Using Modal to cover everything */}
      <Modal
        visible={shouldShowTourBlocker}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        <View style={styles.tourBlocker}>
          <ActivityIndicator
            size="large"
            color={theme.colors.actionPrimary.default}
          />
          <Text style={styles.tourBlockerText}>Preparing your guide…</Text>
        </View>
      </Modal>
    </ScreenView>
  );
};

export default Explore;

const styles = StyleSheet.create({
  screenView: {
    flex: 1,
    paddingHorizontal: 0,
    paddingTop: 0,
  },
  scrollContent: {
    paddingBottom: 130, // Space for Custom Tab Bar
    paddingHorizontal: 16,
    paddingTop: 20,
    gap: 32, // Consistent space between sections
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
  tourBlocker: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.background.default,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 99999,
    gap: 16,
  },
  tourBlockerText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
    fontWeight: "600",
  },
});
