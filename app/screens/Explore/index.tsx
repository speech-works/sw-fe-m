import { LinearGradient } from "expo-linear-gradient";
import { useRoute, useNavigation } from "@react-navigation/native";
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
import { BlurView } from "expo-blur";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { getAllSessionsOfUser } from "../../api";
import BgPattern_404 from "../../assets/sw-bg/BgPattern_404";
import ErrorFace from "../../assets/sw-faces/ErrorFace";
import BottomSheetModal from "../../components/BottomSheetModal";
import ScreenView from "../../components/ScreenView";
import usePullToRefresh from "../../hooks/usePullToRefresh";
import { useEventStore } from "../../stores/events"; // Added missing import
import { EVENT_NAMES } from "../../stores/events/constants"; // Added missing import
import { usePracticeCategorySummaryStore } from "../../stores/practiceCategorySummary";
import { useSessionStore } from "../../stores/session";
import { useUserStore } from "../../stores/user";
import { theme } from "../../Theme/tokens";
import { parseTextStyle } from "../../util/functions/parseStyles";
import BuyPro from "../Settings/components/BuyPro";
import LibrarySection from "./components/LibrarySection";
import PracticeGrid from "./components/PracticeGrid";
import WorldExplorationGraph from "./components/WorldExplorationGraph";


const Explore = () => {
  const { user } = useUserStore();
  const { practiceSession, setSession, clearSession } = useSessionStore();
  const { fetchSummary } = usePracticeCategorySummaryStore();
  const { events, clear } = useEventStore();
  const insets = useSafeAreaInsets();
  const HEADER_HEIGHT = 100;
  const scrollViewRef = useRef<ScrollView>(null);
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const [jumpInY, setJumpInY] = useState(400); // Default rough height

  const [interactionsDone, setInteractionsDone] = useState(false);



  // --- NEW: Scroll State for pausing animations ---
  const [isScrolling, setIsScrolling] = useState(false);
  // ----------------------------------------

  // Unused memoizations removed

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
      await fetchSummary(user.id, true);
    }
  }, [fetchSummary, syncSessionWithBackend, user?.id]);

  const { refreshControl } = usePullToRefresh(handleScreenRefresh); // Removed refreshing since not used directly in new layout



  useEffect(() => {
    if (!user) return;
    const fetchCategorySummary = async () => {
      await fetchSummary(user.id);
    };
    fetchCategorySummary();
  }, [fetchSummary, user?.id]);

  useEffect(() => {
    if (route.params?.scrollToJumpIn) {
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ x: 0, y: Math.max(0, jumpInY - HEADER_HEIGHT - 60), animated: true });
        navigation.setParams({ scrollToJumpIn: undefined });
      }, 500);
    }
  }, [route.params?.scrollToJumpIn, jumpInY]);

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
        <BlurView
          intensity={80}
          tint="light"
          style={[
            styles.header,
            {
              paddingTop: insets.top + 20,
              height: HEADER_HEIGHT + insets.top,
            },
          ]}
        >
          <Text style={styles.title}>Explore</Text>
          <Text style={styles.subtitle}>
            Discover new ways to improve your speech.
          </Text>
        </BlurView>
        <ScrollView
          ref={scrollViewRef}
          refreshControl={refreshControl}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: HEADER_HEIGHT + insets.top + 28 },
          ]}
          showsVerticalScrollIndicator={false}
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
          {/* World Exploration Map */}
          <WorldExplorationGraph />

          <View style={{ height: 12 }} />

          {/* 4 Types of Practice Grid */}
          <View onLayout={(e) => setJumpInY(e.nativeEvent.layout.y)}>
            <PracticeGrid isScrolling={isScrolling} />
          </View>

          <View style={{ height: 28 }} />

          {/* Upgrade CTA */}
          <BuyPro onLayoutCapture={() => {}} />

          <View style={{ height: 28 }} />

          {/* Inline Library Section */}
          <LibrarySection onLayoutCapture={() => {}} />
        </ScrollView>
      </View>




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
    paddingTop: 0,
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    paddingHorizontal: 16,
    gap: 4,
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
