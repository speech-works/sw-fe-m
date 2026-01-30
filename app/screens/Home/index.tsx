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
import { startOasesCollection, getOasesProgress } from "../../api/oases";
import OASESWidget from "../../components/OASESWidget";
import { useNavigation } from "@react-navigation/native";
import { useMoodCheckStore } from "../../stores/mood";

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
  } | null>(null);

  // --- OASES Rapid Collection Auto-Start ---
  React.useEffect(() => {
    if (!user?.hasCompletedOnboarding) return;

    const initOases = async () => {
      try {
        // Step 2: Initialize Collection (Idempotent)
        await startOasesCollection().catch((err) => {
          console.warn(
            "[Home] startOasesCollection failed (continuing to fetch progress):",
            err.response?.data || err.message,
          );
        });

        // Fetch Progress
        const progress = await getOasesProgress();

        const safeDay =
          progress && typeof progress.dayNumber === "number"
            ? progress.dayNumber + 1
            : 1;

        setOasesProgress({
          dayNumber: safeDay, // 0-indexed from backend, display 1-indexed
          totalDays: 7, // Fixed 7-day flow
        });
      } catch (err: any) {
        console.error(
          "[Home] Failed to load OASES progress:",
          err.response?.data || err.message,
        );
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
  const showMoodCheck = !hasRecordedToday;
  const totalPages = showMoodCheck ? 2 : 1;
  const paginationData = Array.from({ length: totalPages }, (_, i) => i);

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
            <View
              style={[
                styles.carouselItem,
                { width: carouselItemWidth, marginRight: carouselSpacing },
              ]}
            >
              {user && !user.hasCompletedOnboarding ? (
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
                    style={[styles.dot, { width: dotWidth, opacity: opacity }]}
                  />
                );
              })}
            </View>
          )}
        </View>
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
