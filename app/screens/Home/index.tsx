import React, { useState, useCallback, useRef } from "react";
import {
  ScrollView,
  Text,
  View,
  StyleSheet,
  RefreshControl,
  Dimensions,
  Animated,
} from "react-native";
import ScreenView from "../../components/ScreenView";
import ClinicalStatsWidget from "../../components/Dashboard/ClinicalStatsWidget";
import SmartRecommendationCard from "../../components/Dashboard/SmartRecommendationCard";
import { theme } from "../../Theme/tokens";
import { parseTextStyle } from "../../util/functions/parseStyles";
import ResourceStats from "../Academy/components/ResourceStats";
import { useUserStore } from "../../stores/user";
import { useUserBehaviorTrendsStore } from "../../stores/userBehaviorTrends";
import { getMyUser } from "../../api/users";
import MoodCheckPopup from "../Academy/components/MoodCheck/MoodCheckPopup";
import MoodCheckBanner from "./components/MoodCheckBanner";
import OnboardingReminderCard from "../../components/OnboardingReminderCard";
import { useOnboardingStore } from "../../stores/onboarding";
import { getActiveOnboardingFlow } from "../../api/onboarding";
import { useEventStore } from "../../stores/events";
import { EVENT_NAMES } from "../../stores/events/constants";
import {
  startOasesCollection,
  getOasesProgress,
  getTodayOasesQuestions,
} from "../../api/oases";
import OASESWidget from "../../components/OASESWidget";
import { useNavigation } from "@react-navigation/native";
import { useMoodCheckStore } from "../../stores/mood";
import { useOasesStore } from "../../stores/oases";

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

  return (
    <ScreenView style={[styles.container, { paddingHorizontal: 0 }]}>
      <MoodCheckPopup />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: 16 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.greeting}>Good Morning,</Text>
          <Text style={styles.subGreeting}>Mayank</Text>
        </View>

        {/* --- Top Carousel --- */}
        {totalPages > 0 && (
          <View style={{ marginHorizontal: -16 }}>
            <Animated.ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                paddingHorizontal: sidePadding,
                marginBottom: 16, // Reduced margin to fit dots
              }}
              snapToInterval={snapInterval}
              decelerationRate="fast"
              snapToAlignment="start"
              onScroll={Animated.event(
                [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                { useNativeDriver: false }, // Width animation requires false
              )}
              scrollEventThrottle={16}
            >
              {/* Card 1: Onboarding or OASES */}
              {(showOnboarding || showOases) && (
                <View
                  style={[
                    styles.carouselItem,
                    { width: carouselItemWidth, marginRight: carouselSpacing },
                  ]}
                >
                  {showOnboarding ? (
                    <OnboardingReminderCard
                      currentStep={currentOnboardingScreen - 1}
                      totalSteps={totalOnboardingScreens}
                      style={{ marginBottom: 0 }}
                      onPress={async () => {
                        try {
                          const state = useOnboardingStore.getState();
                          if (state.flow && state.currentScreen > 1) {
                            emit(EVENT_NAMES.START_ONBOARDING);
                            return;
                          }
                          const flow = await getActiveOnboardingFlow();
                          state.startFresh(flow);
                          emit(EVENT_NAMES.START_ONBOARDING);
                        } catch (err) {
                          console.error("Failed to load onboarding flow:", err);
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
                </View>
              )}

              {/* Card 2: Mood Check (if not recorded today) */}
              {showMoodCheck && (
                <View
                  style={[
                    styles.carouselItem,
                    { width: carouselItemWidth, marginRight: carouselSpacing },
                  ]}
                >
                  <MoodCheckBanner style={{ marginBottom: 0 }} />
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

                  const dotWidth = scrollX.interpolate({
                    inputRange,
                    outputRange: [8, 24, 8],
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
                        { width: dotWidth, opacity: opacity },
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
