import { useRoute, useNavigation } from "@react-navigation/native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getAllSessionsOfUser } from "../../api";
import ScreenView from "../../components/ScreenView";
import usePullToRefresh from "../../hooks/usePullToRefresh";
import { usePracticeCategorySummaryStore } from "../../stores/practiceCategorySummary";
import { useSessionStore } from "../../stores/session";
import { useUserStore } from "../../stores/user";
import { SchemeStatusBar, useTheme, useMotion, spacing, space, radius, size, PageHeader } from "../../design-system";
import { PAYMENTS_ENABLED } from "../../constants/features";
import LibrarySection from "./components/LibrarySection";
import PracticeGrid from "./components/PracticeGrid";
import ProgramsEntryCard from "./components/ProgramsEntryCard";
import WorldExplorationGraph from "./components/WorldExplorationGraph";


const Explore = () => {
  const { colors } = useTheme();
  const m = useMotion();
  const { user } = useUserStore();
  const { practiceSession, setSession, clearSession } = useSessionStore();
  const { fetchSummary } = usePracticeCategorySummaryStore();
  const insets = useSafeAreaInsets();
  const HEADER_HEIGHT = 100;
  const scrollViewRef = useRef<ScrollView>(null);
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const [jumpInY, setJumpInY] = useState(400); // Default rough height

  // --- Scroll State for pausing animations ---
  const [isScrolling, setIsScrolling] = useState(false);
  // ----------------------------------------

  // Bumped on any tap/scroll outside a day cell so "This Week" clears its selection.
  const [deselectSignal, setDeselectSignal] = useState(0);
  const dismissDaySelection = useCallback(() => setDeselectSignal((s) => s + 1), []);

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
      <SchemeStatusBar />
      {/* Dark canvas (overrides the legacy light BgWrapper gradient). */}
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: colors.background.canvas }]} />

      <ScrollView
        ref={scrollViewRef}
        refreshControl={refreshControl}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScrollBeginDrag={() => {
          setIsScrolling(true);
          dismissDaySelection();
        }}
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
        {/* Tap target behind the content: tapping anywhere that isn't a day cell (or
            another pressable) clears the "This Week" day selection. */}
        <Pressable accessible={false} onPress={dismissDaySelection}>
          <PageHeader
            title="Explore"
            description="Discover new ways to improve your speech."
            standalone
          />

          {/* World Exploration Map */}
          <Animated.View entering={m.stagger(0)} style={[styles.section, styles.firstSection]}>
            {/* A short accent rule marks where the page header ends and content begins. */}
            <View style={[styles.sectionRule, { backgroundColor: colors.action.primary }]} />
            <WorldExplorationGraph deselectSignal={deselectSignal} />
          </Animated.View>

          {/* 4 Types of Practice Grid */}
          <Animated.View
            entering={m.stagger(1)}
            style={styles.section}
            onLayout={(e) => setJumpInY(e.nativeEvent.layout.y)}
          >
            <PracticeGrid isScrolling={isScrolling} />
          </Animated.View>

          {PAYMENTS_ENABLED ? (
            <Animated.View entering={m.stagger(2)} style={styles.section}>
              <ProgramsEntryCard />
            </Animated.View>
          ) : null}

          {/* Inline Library Section */}
          <Animated.View entering={m.stagger(PAYMENTS_ENABLED ? 3 : 2)} style={styles.section}>
            <LibrarySection onLayoutCapture={() => {}} />
          </Animated.View>
        </Pressable>
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
    width: 40,
    height: 4,
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
