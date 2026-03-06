import { useNavigation } from "@react-navigation/native";
import React, { useCallback, useRef, useState, useEffect } from "react";
import {
  Animated,
  Dimensions,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  InteractionManager,
  DeviceEventEmitter,
  ActivityIndicator,
  Modal,
} from "react-native";
import { getTodayOasesQuestions, startOasesCollection } from "../../api/oases";
import { getActiveOnboardingFlow } from "../../api/onboarding";
import { getMyUser } from "../../api/users";
import ClinicalStatsWidget from "../../components/Dashboard/ClinicalStatsWidget";
import SmartRecommendationCard from "../../components/Dashboard/SmartRecommendationCard";
import OASESWidget from "../../components/OASESWidget";
import OnboardingReminderCard from "../../components/OnboardingReminderCard";
import ScreenView from "../../components/ScreenView";
import { useEventStore } from "../../stores/events";
import { EVENT_NAMES } from "../../stores/events/constants";
import { useMoodCheckStore } from "../../stores/mood";
import { useOasesStore } from "../../stores/oases";
import { useOnboardingStore } from "../../stores/onboarding";
import { useUserStore } from "../../stores/user";
import { useUserBehaviorTrendsStore } from "../../stores/userBehaviorTrends";
import { theme } from "../../Theme/tokens";
import { parseTextStyle } from "../../util/functions/parseStyles";
import MoodCheckPopup from "../Academy/components/MoodCheck/MoodCheckPopup";
import ResourceStats from "../Academy/components/ResourceStats";
import MoodCheckBanner from "./components/MoodCheckBanner";
import { TourGuideZone, TourGuideZoneByPosition } from "rn-tourguide";
import { useAppTour } from "../../hooks/useAppTour";
import { useTourStore } from "../../stores/tour";

import OnboardingResumeModal from "../../components/OnboardingResumeModal";
const { width } = Dimensions.get("window");

const Home = () => {
  const { user, setUser } = useUserStore();
  const { fetchAllTrends } = useUserBehaviorTrendsStore();
  const { emit } = useEventStore();
  const { hasRecordedToday } = useMoodCheckStore();
  const { hasCompletedHomeTour } = useTourStore();

  const currentOnboardingScreen = useOnboardingStore((s) => s.currentScreen);
  const onboardingFlow = useOnboardingStore((s) => s.flow);
  const getTotalScreens = useOnboardingStore((s) => s.getTotalScreens);
  const totalOnboardingScreens = onboardingFlow ? getTotalScreens() : 1;

  const navigation = useNavigation<any>();
  const [oasesProgress, setOasesProgress] = useState<{
    dayNumber: number;
    totalDays: number;
    totalRemaining: number;
  } | null>(null);
  const [loadingOases, setLoadingOases] = useState(true);
  const [isZone1Measured, setIsZone1Measured] = useState(false);
  const [interactionsDone, setInteractionsDone] = useState(false);
  const [isTourReady, setIsTourReady] = useState(false);

  // Resume Modal State
  const [showResumeModal, setShowResumeModal] = useState(false);

  // Resume Handler
  const handleResumeOnboarding = () => {
    setShowResumeModal(false);
    emit(EVENT_NAMES.START_ONBOARDING);
    // OnboardingWelcome will auto-redirect to current question
  };

  // Start Over Handler
  const handleStartOverOnboarding = async () => {
    setShowResumeModal(false);
    try {
      const flow = await getActiveOnboardingFlow();
      const state = useOnboardingStore.getState();
      state.startFresh(flow); // Resets currentScreen to 1
      emit(EVENT_NAMES.START_ONBOARDING);
      // OnboardingWelcome is screen 1 if no progress, but here we explicitly go to Q1?
      // Actually OnboardingWelcome logic: if !hasProgress -> Show Welcome UI with Start button.
      // So user will see Welcome screen. That is acceptable flow for Start Over.
    } catch (err) {
      console.error("Failed to restart onboarding flow:", err);
    }
  };

  // --- OASES Rapid Collection Auto-Start ---
  React.useEffect(() => {
    if (!user?.hasCompletedOnboarding) return;

    const initOases = async () => {
      try {
        // Step 1: Check Cache (Optimized Load)
        const state = useOasesStore.getState();
        const todayStr = new Date().toISOString().split("T")[0];
        const lastFetchedStr = state.lastFetchedAt
          ? state.lastFetchedAt.split("T")[0]
          : null;

        let batch = state.dailyBatch;

        // If not fetched today, or no batch exists, fetch from API
        if (todayStr !== lastFetchedStr || !batch) {
          try {
            // Initialize Collection (Idempotent)
            await startOasesCollection();
            // Fetch Fresh Batch
            batch = await getTodayOasesQuestions();
            // Update Store (timestamp updated in setter)
            state.setDailyBatch(batch);
          } catch (err: any) {
            console.warn(
              "[Home] Failed to fetch fresh OASES data:",
              err.response?.data || err.message,
            );
            // Fallback to existing batch if any? No, better to hide if fresh fetch failed and might be stale
          }
        } else {
          console.log("[Home] Using cached OASES data for today.");
        }

        // Step 2: Determine Visibility based on Assessment Progress
        // With same-day progression, show widget as long as assessment is not complete
        if (!batch || batch.isComplete) {
          // Assessment fully complete -> Hide widget
          setOasesProgress(null);
          return;
        }

        // Show widget if there are remaining questions (current batch or future batches)
        const totalRemaining = batch.metadata?.totalRemaining ?? 0;
        if (
          totalRemaining === 0 &&
          (!batch.questions || batch.questions.length === 0)
        ) {
          // No remaining questions at all -> Hide widget
          setOasesProgress(null);
          return;
        }

        // Step 3: Set UI State
        const safeDay = batch.dayNumber || 1;
        setOasesProgress({
          dayNumber: safeDay,
          totalDays: 7, // Fixed 7-day flow (for progress display)
          totalRemaining: totalRemaining,
        });
      } catch (err: any) {
        console.error(
          "[Home] Error in OASES init flow:",
          err.response?.data || err.message,
        );
        setOasesProgress(null); // Ensure hidden on error
      } finally {
        setLoadingOases(false);
      }
    };
    initOases();
  }, [user?.hasCompletedOnboarding]);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      setInteractionsDone(true);
    });
    return () => task.cancel();
  }, []);

  useEffect(() => {
    if (!loadingOases && interactionsDone && isZone1Measured) {
      // Extended stability pause - wait for UI to fully settle in native layer
      const timer = setTimeout(() => {
        setIsTourReady(true);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setIsTourReady(false);
    }
  }, [loadingOases, interactionsDone, isZone1Measured]);

  // --- Tour Setup ---
  const verticalScrollRef = useRef<ScrollView>(null);
  const horizontalScrollRef = useRef<ScrollView>(null);
  const zoneLayouts = useRef<{ [key: number]: any }>({});

  const captureLayout = (order: number) => (event: any) => {
    const { x, y, width, height } = event.nativeEvent.layout;
    // Only accept measurement if it's non-zero
    if (width > 0 && height > 0) {
      zoneLayouts.current[order] = { x, y, width, height };
      if (order === 1) {
        setIsZone1Measured(true);
      }
    }
  };

  const {
    isActive: isTourActive,
    start,
    getCurrentStep,
  } = useAppTour(
    "home",
    { vertical: verticalScrollRef, horizontal: horizontalScrollRef },
    zoneLayouts,
    isTourReady,
  );

  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const [user] = await Promise.all([getMyUser(), fetchAllTrends()]);
      setUser(user);
      setRefreshKey((prev) => prev + 1); // Triggers re-mount/refresh of child components if needed
    } catch (error) {
      console.error("Failed to refresh home:", error);
    } finally {
      setRefreshing(false);
    }
  }, [setUser, fetchAllTrends]);

  const carouselItemWidth = width - 32; // Exact match to other cards (width - 32)
  const carouselSpacing = 8;
  // Calculate padding to center the card.
  // Carousel is full width (width).
  const sidePadding = (width - carouselItemWidth) / 2;
  const snapInterval = carouselItemWidth + carouselSpacing;

  // Pagination Logic (React Native Animated)
  const scrollX = useRef(new Animated.Value(0)).current;
  const scrollHandler = React.useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
        useNativeDriver: true,
      }),
    [scrollX],
  );

  // Calculate total pages logic
  const showOnboarding = user && !user.hasCompletedOnboarding;
  const showOases = !!oasesProgress && !showOnboarding;
  const showMoodCheck = !hasRecordedToday;

  const cards = [];
  if (showOnboarding) cards.push("onboarding");
  else if (showOases) cards.push("oases");

  if (showMoodCheck) cards.push("mood");

  const totalPages = cards.length;
  const paginationData = Array.from({ length: totalPages }, (_, i) => i);

  if (totalPages === 0) {
    // If no cards, hide the whole carousel section?
    // Or just render nothing inside.
    // The View container has margins, might want to return null or hide it.
    // For now, let's just let it be empty or hide if totalPages 0
  }

  const currentHour = new Date().getHours();
  const greeting =
    currentHour < 12
      ? "Good Morning,"
      : currentHour < 18
        ? "Good Afternoon,"
        : "Good Evening,";
  const firstName = user?.name ? user.name.split(" ")[0] : "";

  // Show a full-screen loader to block interaction until tour initializes
  const shouldShowTourBlocker = !hasCompletedHomeTour && !isTourActive;

  return (
    <ScreenView style={[styles.container, { paddingHorizontal: 0 }]}>
      {/* Suppress MoodCheck and other Modals unless tour is finished */}
      {hasCompletedHomeTour && interactionsDone && <MoodCheckPopup />}

      <ScrollView
        ref={verticalScrollRef}
        scrollEnabled={hasCompletedHomeTour && !isTourActive}
        contentContainerStyle={[styles.scroll, { paddingHorizontal: 16 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.greeting}>{greeting}</Text>
          {firstName ? (
            <Text style={styles.subGreeting}>{firstName}</Text>
          ) : null}
        </View>

        {/* --- Top Carousel --- */}
        {totalPages > 0 && (
          <View style={{ marginHorizontal: -16 }}>
            <Animated.ScrollView
              ref={horizontalScrollRef as any}
              horizontal
              scrollEnabled={hasCompletedHomeTour && !isTourActive}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                paddingHorizontal: sidePadding,
                marginBottom: 16, // Reduced margin to fit dots
              }}
              snapToInterval={snapInterval}
              decelerationRate="fast"
              snapToAlignment="start"
              onScroll={scrollHandler}
              scrollEventThrottle={16}
            >
              {/* Card 1: Onboarding or OASES */}
              <TourGuideZone
                zone={1}
                text="Daily Focus: Quickly access your most important tasks, like assessments or onboarding, to keep your progress on track."
                shape="rectangle"
              >
                <View
                  onLayout={captureLayout(1)}
                  collapsable={false}
                  style={[
                    styles.carouselItem,
                    { width: carouselItemWidth, marginRight: carouselSpacing },
                  ]}
                >
                  <View collapsable={false} style={{ flex: 1 }}>
                    {showOnboarding ? (
                      <OnboardingReminderCard
                        currentStep={currentOnboardingScreen - 1}
                        totalSteps={totalOnboardingScreens}
                        style={{ marginBottom: 0 }}
                        onPress={async () => {
                          try {
                            const state = useOnboardingStore.getState();
                            if (
                              state.flow &&
                              (state.currentScreen > 1 ||
                                Object.keys(state.answers).length > 0)
                            ) {
                              setShowResumeModal(true);
                              return;
                            }
                            const flow = await getActiveOnboardingFlow();
                            state.startFresh(flow);
                            emit(EVENT_NAMES.START_ONBOARDING);
                          } catch (err) {
                            console.error(
                              "Failed to load onboarding flow:",
                              err,
                            );
                          }
                        }}
                      />
                    ) : showOases ? (
                      <OASESWidget
                        dayNumber={oasesProgress?.dayNumber}
                        totalDays={oasesProgress?.totalDays}
                        totalRemaining={oasesProgress?.totalRemaining}
                        style={{ marginBottom: 0 }}
                        onPress={() => {
                          navigation.navigate("AcademyStack", {
                            screen: "DailyPracticeStack",
                            params: { screen: "OASESIntro" },
                          });
                        }}
                      />
                    ) : (
                      <View
                        style={{
                          height: 220,
                          backgroundColor: "rgba(0,0,0,0.02)",
                          borderRadius: 24,
                        }}
                      />
                    )}
                  </View>
                </View>
              </TourGuideZone>

              {/* Card 2: Mood Check */}
              {showMoodCheck && (
                <View
                  onLayout={captureLayout(2)}
                  style={[
                    styles.carouselItem,
                    { width: carouselItemWidth, marginRight: carouselSpacing },
                  ]}
                >
                  <TourGuideZone
                    zone={2}
                    text="Mood Check: Log your daily vibes to see how your feelings influence your speech journey over time."
                    shape="rectangle"
                  >
                    <View collapsable={false}>
                      {interactionsDone ? (
                        <MoodCheckBanner style={{ marginBottom: 0 }} />
                      ) : (
                        <View
                          style={{
                            height: 260,
                            borderRadius: 24,
                            backgroundColor: "rgba(0,0,0,0.02)",
                          }}
                        />
                      )}
                    </View>
                  </TourGuideZone>
                </View>
              )}
            </Animated.ScrollView>

            {/* Pagination Indicators */}
            {totalPages > 1 && (
              <View style={styles.paginationContainer}>
                {paginationData.map((_, index) => {
                  const inputRange = [
                    (index - 1) * snapInterval,
                    index * snapInterval,
                    (index + 1) * snapInterval,
                  ];

                  const dotScaleX = scrollX.interpolate({
                    inputRange,
                    outputRange: [1, 3, 1], // Equivalent to 8, 24, 8 width
                    extrapolate: "clamp",
                  });

                  const opacity = scrollX.interpolate({
                    inputRange,
                    outputRange: [0.4, 1, 0.4],
                    extrapolate: "clamp",
                  });

                  return (
                    <Animated.View
                      key={index}
                      style={[
                        styles.dot,
                        {
                          transform: [{ scaleX: dotScaleX }],
                          opacity: opacity,
                        },
                      ]}
                    />
                  );
                })}
              </View>
            )}
          </View>
        )}
        {/* ------------------- */}

        <ResourceStats refreshing={refreshing} />

        <View style={{ height: 24 }} />

        <SmartRecommendationCard key={`rec-${refreshKey}`} />

        <ClinicalStatsWidget />
      </ScrollView>

      {/* Resume Modal Overlay - Suppressed until tour is done */}
      {hasCompletedHomeTour && (
        <OnboardingResumeModal
          visible={showResumeModal}
          onResume={handleResumeOnboarding}
          onStartOver={handleStartOverOnboarding}
          onDismiss={() => setShowResumeModal(false)}
        />
      )}

      {/* Tour Blocker Overlay - Using Modal to cover everything including Tab Bar */}
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
          <Text style={styles.tourBlockerText}>Loading guided tour…</Text>
        </View>
      </Modal>
    </ScreenView>
  );
};
const styles = StyleSheet.create({
  container: {
    paddingTop: 16,
  },
  scroll: {
    paddingBottom: 130, // Space for Custom Tab Bar
  },
  header: {
    marginBottom: 16,
    minHeight: 60,
  },
  greeting: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.default,
  },
  subGreeting: {
    ...parseTextStyle(theme.typography.Heading1),
    color: theme.colors.text.title,
  },
  carouselContent: {
    // Deprecated, handled inline
    marginBottom: 24,
  },
  carouselItem: {
    // Deprecated, handled inline
  },
  paginationContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginBottom: 24,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.background.default,
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
export default Home;
