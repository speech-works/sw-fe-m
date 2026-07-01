import { useRoute, useNavigation } from "@react-navigation/native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ScrollView, StatusBar, StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getAllSessionsOfUser } from "../../api";
import ScreenView from "../../components/ScreenView";
import usePullToRefresh from "../../hooks/usePullToRefresh";
import { useEventStore } from "../../stores/events";
import { usePracticeCategorySummaryStore } from "../../stores/practiceCategorySummary";
import { useSessionStore } from "../../stores/session";
import { useUserStore } from "../../stores/user";
import { useTheme, useMotion, spacing, space, radius, size, PageHeader } from "../../design-system";
import LibrarySection from "./components/LibrarySection";
import PracticeGrid from "./components/PracticeGrid";
import WorldExplorationGraph from "./components/WorldExplorationGraph";


const Explore = () => {
  const { colors } = useTheme();
  const m = useMotion();
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

  // --- Scroll State for pausing animations ---
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
    <ScreenView style={[styles.screenView, { backgroundColor: colors.background.canvas }]}>
      <StatusBar barStyle="light-content" />
      {/* Dark canvas (overrides the legacy light BgWrapper gradient). */}
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: colors.background.canvas }]} />

      <ScrollView
        ref={scrollViewRef}
        refreshControl={refreshControl}
        contentContainerStyle={styles.scrollContent}
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
        <PageHeader
          title="Explore"
          description="Discover new ways to improve your speech."
          standalone
        />

        {/* World Exploration Map */}
        <Animated.View entering={m.stagger(0)} style={[styles.section, styles.firstSection]}>
          {/* A short accent rule marks where the page header ends and content begins. */}
          <View style={[styles.sectionRule, { backgroundColor: colors.action.primary }]} />
          <WorldExplorationGraph />
        </Animated.View>

        {/* 4 Types of Practice Grid */}
        <Animated.View
          entering={m.stagger(1)}
          style={styles.section}
          onLayout={(e) => setJumpInY(e.nativeEvent.layout.y)}
        >
          <PracticeGrid isScrolling={isScrolling} />
        </Animated.View>

        {/* Inline Library Section */}
        <Animated.View entering={m.stagger(2)} style={styles.section}>
          <LibrarySection onLayoutCapture={() => {}} />
        </Animated.View>
      </ScrollView>

      {/* Opaque cap so scrolled content doesn't bleed under the status bar. */}
      <View style={[styles.statusCap, { height: insets.top, backgroundColor: colors.background.canvas }]} />
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
    paddingBottom: size.tabBarSafe,
    paddingHorizontal: 0,
  },
  section: {
    marginHorizontal: space.screenX,
    marginTop: space.groupGap,
  },
  // Breathing room between the page header and the first section, where the accent
  // rule sits to mark the boundary.
  firstSection: {
    marginTop: spacing["3xl"],
  },
  // Short brand-orange rule marking the start of the content (header ↔ first section).
  sectionRule: {
    width: 28,
    height: 3,
    borderRadius: radius.xs,
    marginBottom: spacing.md,
  },
  statusCap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
});
