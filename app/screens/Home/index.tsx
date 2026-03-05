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

import { TourGuideZone, useTourGuideController } from "rn-tourguide";

import OnboardingResumeModal from "../../components/OnboardingResumeModal";
import { useTourStore } from "../../stores/tour";
const { width } = Dimensions.get("window");

const Home = () => {
  const { user, setUser } = useUserStore();
  const { fetchAllTrends } = useUserBehaviorTrendsStore();
  const { emit } = useEventStore();
  const { hasRecordedToday } = useMoodCheckStore();

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
      }
    };
    initOases();
  }, [user?.hasCompletedOnboarding]);

  // --- Tour Logic (rn-tourguide) ---
  // --- Tour Logic (rn-tourguide) ---
  const { start, canStart, stop, eventEmitter, getCurrentStep } =
    useTourGuideController();
  const { hasCompletedTour, finishTour } = useTourStore();
  const [isTourActive, setIsTourActive] = useState(false);

  // Refs for precise auto-scrolling
  const verticalScrollRef = useRef<ScrollView>(null);
  const horizontalScrollRef = useRef<ScrollView>(null);
  const zoneYPositions = useRef<{ [zone: number]: number }>({});
  const zoneHeights = useRef<{ [zone: number]: number }>({});
  const zoneXPositions = useRef<{ [zone: number]: number }>({});

  useEffect(() => {
    if (canStart && !hasCompletedTour && !getCurrentStep()) {
      // Small delay to ensure all zones are registered
      const timer = setTimeout(() => {
        start();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [canStart, hasCompletedTour, start, getCurrentStep]);

  // Handle tour completion to prevent re-runs
  useEffect(() => {
    if (!eventEmitter) return;
    const handleStart = () => setIsTourActive(true);
    const handleStop = () => {
      setIsTourActive(false);
      finishTour();
    };
    eventEmitter.on("start", handleStart);
    eventEmitter.on("stop", handleStop);
    return () => {
      eventEmitter.off("start", handleStart);
      eventEmitter.off("stop", handleStop);
    };
  }, [eventEmitter, finishTour]);

  // Intercept Navigation to Auto-Scroll
  useEffect(() => {
    const handleTourNavigation = (
      event: "next" | "prev",
      {
        currentStep,
        handleNext,
        handlePrev,
      }: { currentStep: any; handleNext?: () => void; handlePrev?: () => void },
    ) => {
      const targetOrder =
        event === "next" ? currentStep.order + 1 : currentStep.order - 1;

      const yOffset = zoneYPositions.current[targetOrder];
      const height = zoneHeights.current[targetOrder] || 0;
      // Note: X offset scrolling currently only applicable if we are scrolling within horizontal carousel.
      // We will handle basic vertical scrolling first.

      if (yOffset !== undefined && verticalScrollRef.current) {
        // Scroll vertically ensuring element is perfectly centered.
        const { height: screenHeight } = Dimensions.get("window");
        const targetY = Math.max(0, yOffset - screenHeight / 2 + height / 2);

        verticalScrollRef.current.scrollTo({
          y: targetY,
          animated: true,
        });

        // Horizontal scroll logic for Zones 2,3 (which are inside horizontal carousel)
        if (targetOrder === 2 && horizontalScrollRef.current) {
          horizontalScrollRef.current.scrollTo({ x: 0, animated: true });
        } else if (targetOrder === 3 && horizontalScrollRef.current) {
          horizontalScrollRef.current.scrollTo({
            x: carouselItemWidth + carouselSpacing,
            animated: true,
          });
        }

        // Wait for smooth scroll to finish before moving tour step
        setTimeout(() => {
          if (event === "next" && handleNext) handleNext();
          if (event === "prev" && handlePrev) handlePrev();
        }, 350); // Typical RN scroll animation duration
      } else {
        // Fallback immediately if position unknown
        if (event === "next" && handleNext) handleNext();
        if (event === "prev" && handlePrev) handlePrev();
      }
    };

    const nextListener = DeviceEventEmitter.addListener("tour:next", (data) =>
      handleTourNavigation("next", data),
    );
    const prevListener = DeviceEventEmitter.addListener("tour:prev", (data) =>
      handleTourNavigation("prev", data),
    );

    return () => {
      nextListener.remove();
      prevListener.remove();
    };
  }, []);

  const [interactionsDone, setInteractionsDone] = useState(false);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      setInteractionsDone(true);
    });
    return () => task.cancel();
  }, []);

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

  return (
    <ScreenView style={[styles.container, { paddingHorizontal: 0 }]}>
      {interactionsDone && <MoodCheckPopup />}
      <ScrollView
        ref={verticalScrollRef}
        scrollEnabled={!isTourActive}
        contentContainerStyle={[styles.scroll, { paddingHorizontal: 16 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View
          onLayout={(e) => {
            zoneYPositions.current[1] = e.nativeEvent.layout.y;
            zoneHeights.current[1] = e.nativeEvent.layout.height;
          }}
        >
          <TourGuideZone
            zone={1}
            text="Welcome to Speechworks! 👋 Let's help you master your speech with daily practices and insights."
            shape="rectangle"
          >
            <View style={styles.header}>
              <Text style={styles.greeting}>{greeting}</Text>
              {firstName ? (
                <Text style={styles.subGreeting}>{firstName}</Text>
              ) : null}
            </View>
          </TourGuideZone>
        </View>

        {/* --- Top Carousel --- */}
        {totalPages > 0 && (
          <View style={{ marginHorizontal: -16 }}>
            <Animated.ScrollView
              ref={horizontalScrollRef as any}
              horizontal
              scrollEnabled={!isTourActive}
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
              {(showOnboarding || showOases) && (
                <View
                  onLayout={(e) => {
                    // Mark global Y position of entire Carousel relative to vertical ScrollView for Zone 2 and 3
                    zoneYPositions.current[2] =
                      zoneYPositions.current[2] || e.nativeEvent.layout.y; // Simplified
                    zoneHeights.current[2] =
                      zoneHeights.current[2] || e.nativeEvent.layout.height;
                    zoneXPositions.current[2] = e.nativeEvent.layout.x;
                  }}
                  style={[
                    styles.carouselItem,
                    { width: carouselItemWidth, marginRight: carouselSpacing },
                  ]}
                >
                  <TourGuideZone
                    zone={2}
                    text="Your Daily Focus: Complete your OASES assessment and onboarding tasks here."
                    shape="rectangle"
                  >
                    {showOnboarding ? (
                      <OnboardingReminderCard
                        currentStep={currentOnboardingScreen - 1}
                        totalSteps={totalOnboardingScreens}
                        style={{ marginBottom: 0 }}
                        onPress={async () => {
                          try {
                            const state = useOnboardingStore.getState();
                            // Check for valid progress to resume
                            if (
                              state.flow &&
                              (state.currentScreen > 1 ||
                                Object.keys(state.answers).length > 0)
                            ) {
                              // Show modal on Dashboard instead of navigating immediately
                              setShowResumeModal(true);
                              return;
                            }

                            // No progress? Start fresh immediately
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
                    ) : (
                      <OASESWidget
                        dayNumber={oasesProgress?.dayNumber}
                        totalDays={oasesProgress?.totalDays}
                        totalRemaining={oasesProgress?.totalRemaining}
                        style={{ marginBottom: 0 }}
                        onPress={() => {
                          navigation.navigate("AcademyStack", {
                            screen: "DailyPracticeStack",
                            params: {
                              screen: "OASESIntro",
                            },
                          });
                        }}
                      />
                    )}
                  </TourGuideZone>
                </View>
              )}

              {/* Card 2: Mood Check (if not recorded today) */}
              {showMoodCheck && (
                <View
                  onLayout={(e) => {
                    zoneYPositions.current[3] =
                      zoneYPositions.current[3] || e.nativeEvent.layout.y;
                    zoneHeights.current[3] =
                      zoneHeights.current[3] || e.nativeEvent.layout.height;
                    zoneXPositions.current[3] = e.nativeEvent.layout.x;
                  }}
                  style={[
                    styles.carouselItem,
                    { width: carouselItemWidth, marginRight: carouselSpacing },
                  ]}
                >
                  <TourGuideZone
                    zone={3}
                    text="Mood Check: Tracking your daily mood helps us identify patterns in your speech journey."
                    shape="rectangle"
                  >
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

        <View
          onLayout={(e) => {
            zoneYPositions.current[4] = e.nativeEvent.layout.y;
            zoneHeights.current[4] = e.nativeEvent.layout.height;
          }}
        >
          <TourGuideZone
            zone={4}
            text="Energy & Progress: Stamina powers your daily exercises. It refills over time so you can keep practicing!"
            shape="rectangle"
          >
            <ResourceStats refreshing={refreshing} />
          </TourGuideZone>
        </View>

        <View style={{ height: 24 }} />

        <View
          onLayout={(e) => {
            zoneYPositions.current[5] = e.nativeEvent.layout.y;
            zoneHeights.current[5] = e.nativeEvent.layout.height;
          }}
        >
          <TourGuideZone
            zone={5}
            text="Smart Recommendations: Personalized suggestions to help you reach your goals faster."
            shape="rectangle"
          >
            <SmartRecommendationCard key={`rec-${refreshKey}`} />
          </TourGuideZone>
        </View>

        <ClinicalStatsWidget />
      </ScrollView>

      {/* Resume Modal Overlay */}
      <OnboardingResumeModal
        visible={showResumeModal}
        onResume={handleResumeOnboarding}
        onStartOver={handleStartOverOnboarding}
        onDismiss={() => setShowResumeModal(false)}
      />
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
});
export default Home;
