import React, { useState, useCallback } from "react";
import {
  ScrollView,
  Text,
  View,
  StyleSheet,
  RefreshControl,
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

const Home = () => {
  const { user, setUser } = useUserStore();
  const { fetchAllTrends } = useUserBehaviorTrendsStore();
  const { emit } = useEventStore();

  const currentOnboardingScreen = useOnboardingStore((s) => s.currentScreen);
  const onboardingFlow = useOnboardingStore((s) => s.flow);
  const getTotalScreens = useOnboardingStore((s) => s.getTotalScreens);
  const totalOnboardingScreens = onboardingFlow ? getTotalScreens() : 1;

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

  return (
    <ScreenView style={styles.container}>
      <MoodCheckPopup />
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.greeting}>Good Morning,</Text>
          <Text style={styles.subGreeting}>Mayank</Text>
        </View>

        <MoodCheckBanner />

        <ResourceStats refreshing={refreshing} />

        <View style={{ height: 24 }} />

        <SmartRecommendationCard key={`rec-${refreshKey}`} />

        <ClinicalStatsWidget />

        {user && !user.hasCompletedOnboarding && (
          <OnboardingReminderCard
            currentStep={currentOnboardingScreen - 1}
            totalSteps={totalOnboardingScreens}
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
        )}
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
    marginBottom: 8,
  },
  greeting: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.default,
  },
  subGreeting: {
    ...parseTextStyle(theme.typography.Heading1),
    color: theme.colors.text.title,
  },
});
export default Home;
