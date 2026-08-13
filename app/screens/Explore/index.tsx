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
import { SchemeStatusBar, useTheme, useMotion, useNavBarInset, spacing, space, radius, size, PageHeader } from "../../design-system";
import { purchasesAvailable } from "../../services/purchases";
import LibrarySection from "./components/LibrarySection";
import PracticeGrid from "./components/PracticeGrid";
import ProgramsEntryCard from "./components/ProgramsEntryCard";
import WorldExplorationGraph from "./components/WorldExplorationGraph";


const Explore = () => {
  const { colors } = useTheme();
  const navBarInset = useNavBarInset();
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

  // Both inputs are process-lifetime constants read from expoConfig.extra, so
  // this is stable across renders — no memo needed.
  const canSell = purchasesAvailable();

  return (
    <ScreenView style={[styles.screenView, { backgroundColor: colors.background.canvas }]}>
      <SchemeStatusBar />
      {/* Dark canvas (overrides the legacy light BgWrapper gradient). */}
      {/* pointerEvents="none": a full-screen decorative fill must never be a
          touch target. It is harmless today only because sibling order puts the
          ScrollView ahead of it in Android's reverse-z hit walk — one zIndex or
          reorder away from swallowing every tap on the page. */}
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFillObject, { backgroundColor: colors.background.canvas }]}
      />

      <ScrollView
        ref={scrollViewRef}
        refreshControl={refreshControl}
        contentContainerStyle={[
          styles.scrollContent,
          // The floating dock moves up by the nav bar under edge-to-edge, so its
          // clearance has to follow or the last row hides behind it. 0 on iOS.
          { paddingBottom: size.tabBarSafe + navBarInset },
        ]}
        showsVerticalScrollIndicator={false}
        onScrollBeginDrag={dismissDaySelection}
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
            {/* A 3px rule is a thin graphic, so it takes the per-scheme orange
                FOREGROUND cut, not the fill. `action.primary` is 8.24:1 on ink
                and 2.02:1 on paper — at this width that is not a quiet rule,
                it is a missing one. */}
            <View style={[styles.sectionRule, { backgroundColor: colors.text.accent }]} />
            <WorldExplorationGraph deselectSignal={deselectSignal} />
          </Animated.View>

          {/* 4 Types of Practice Grid */}
          <Animated.View
            entering={m.stagger(1)}
            style={styles.section}
            onLayout={(e) => setJumpInY(e.nativeEvent.layout.y)}
          >
            <PracticeGrid />
          </Animated.View>

          {/* purchasesAvailable(), not the raw flag: this card is the entrance
              to the paid-program shop, and on a build with no RevenueCat key
              for this platform every route out of it dead-ends at a paywall
              that can't sell. */}
          {canSell ? (
            <Animated.View entering={m.stagger(2)} style={styles.section}>
              <ProgramsEntryCard />
            </Animated.View>
          ) : null}

          {/* Inline Library Section */}
          <Animated.View entering={m.stagger(canSell ? 3 : 2)} style={styles.section}>
            <LibrarySection onLayoutCapture={() => {}} />
          </Animated.View>
        </Pressable>
      </ScrollView>

      {/* Opaque cap so scrolled content doesn't bleed under the status bar.
          pointerEvents="none" is REQUIRED, not cosmetic: this is an absolutely
          positioned View at zIndex 10 spanning the full width, so without it
          every tap landing in the status-bar band is swallowed by a decorative
          rectangle. A control sitting under it looks fine and does nothing —
          and scrolling "fixes" it only because the control moves out of the
          band. Community and ShareMoment already guard their copies of this. */}
      <View
        pointerEvents="none"
        style={[styles.statusCap, { height: insets.top, backgroundColor: colors.background.canvas }]}
      />
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
