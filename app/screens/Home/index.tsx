import React, { useCallback, useEffect, useState } from "react";
import { RefreshControl, View } from "react-native";
import { getActiveOnboardingFlow } from "../../api/onboarding";
import { getMyUser } from "../../api/users";
import ClinicalStatsWidget from "../../components/Dashboard/ClinicalStatsWidget";
import SmartRecommendationCard from "../../components/Dashboard/SmartRecommendationCard";
import OnboardingReminderCard from "../../components/OnboardingReminderCard";
import { useEventStore } from "../../stores/events";
import { EVENT_NAMES } from "../../stores/events/constants";
import { useMoodCheckStore } from "../../stores/mood";
import { useOnboardingStore } from "../../stores/onboarding";
import { useUserStore } from "../../stores/user";
import { useUserBehaviorTrendsStore } from "../../stores/userBehaviorTrends";
import MoodCheckPopup from "../Academy/components/MoodCheck/MoodCheckPopup";
import { IdentityBlock } from "./components/IdentityBlock";
import MoodCheckBanner from "./components/MoodCheckBanner";
import Toast from "react-native-toast-message";
import OnboardingResumeModal from "../../components/OnboardingResumeModal";
import ForYouCarousel from "../../components/Dashboard/ForYouCarousel";
import {
  Page,
  Carousel,
  Text,
  useTheme,
  makeStyles,
  space,
  radius,
} from "../../design-system";
import { InteractionManager } from "react-native";

const Home = () => {
  const { colors } = useTheme();
  const styles = useStyles();
  const { user, setUser } = useUserStore();
  const { fetchAllTrends } = useUserBehaviorTrendsStore();
  const { emit } = useEventStore();
  const { hasRecordedToday } = useMoodCheckStore();

  const currentOnboardingScreen = useOnboardingStore((s) => s.currentScreen);
  const onboardingFlow = useOnboardingStore((s) => s.flow);
  const getTotalScreens = useOnboardingStore((s) => s.getTotalScreens);
  const totalOnboardingScreens = onboardingFlow ? getTotalScreens() : 1;


  // Resume Modal State
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [interactionsDone, setInteractionsDone] = useState(false);

  // Pagination & Visibility Logic (Derived State)
  const showOnboarding =
    user && !user.hasCompletedOnboarding;
  const showMoodCheck = !hasRecordedToday;

  const cards: string[] = [];
  if (showOnboarding) cards.push("onboarding");

  if (showMoodCheck) cards.push("mood");

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
      const oldLevel = user?.level;
      const [freshUser] = await Promise.all([getMyUser(), fetchAllTrends()]);
      setUser(freshUser);

      // Detect regression
      if (
        oldLevel &&
        freshUser.level !== undefined &&
        freshUser.level < oldLevel
      ) {
        Toast.show({
          type: "info",
          text1: "Level adjusted",
          text2:
            "Your level settled after a sync — every practice grows it again.",
        });
      }

      setRefreshKey((prev) => prev + 1);
    } catch (error) {
      console.error("Failed to refresh home:", error);
    } finally {
      setRefreshing(false);
    }
  }, [fetchAllTrends, setUser, user?.level]);

  const currentHour = new Date().getHours();
  const greeting =
    currentHour < 12
      ? "Good Morning,"
      : currentHour < 18
        ? "Good Afternoon,"
        : "Good Evening,";
  const firstName = user?.name ? user.name.split(" ")[0] : "";

  const renderCard = (cardType: string) => {
    if (cardType === "onboarding") {
      return (
        <OnboardingReminderCard
          currentStep={currentOnboardingScreen - 1}
          totalSteps={totalOnboardingScreens}
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
              console.error("Failed to load onboarding flow:", err);
            }
          }}
        />
      );
    }
    if (cardType === "mood") {
      return interactionsDone ? (
        <MoodCheckBanner />
      ) : (
        <View style={styles.cardPlaceholder} />
      );
    }
    return null;
  };

  return (
    <>
      <Page
        tabBarSafe
        contentGap={space.sectionGap}
        hero={
          <View>
            <Text variant="h3" color="secondary">
              {greeting}
            </Text>
            {firstName ? (
              <Text variant="screenTitle" color="primary">
                {firstName}
              </Text>
            ) : null}
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.text.secondary}
            colors={[colors.action.primary]}
          />
        }
      >
        <IdentityBlock />

        <SmartRecommendationCard key={`rec-${refreshKey}`} />

        {/* The only thing on Home that sells. SmartRecommendationCard above
            keeps "what to do today"; this shows what to consider next. */}
        <ForYouCarousel key={`foryou-${refreshKey}`} />

        <ClinicalStatsWidget />

        {cards.length > 0 ? (
          <Carousel
            data={cards}
            keyExtractor={(c) => c}
            renderItem={({ item }) => renderCard(item)}
          />
        ) : null}
      </Page>

      {interactionsDone && <MoodCheckPopup />}

      {/* Resume Modal Overlay */}
      <OnboardingResumeModal
        visible={showResumeModal}
        onResume={handleResumeOnboarding}
        onStartOver={handleStartOverOnboarding}
        onDismiss={() => setShowResumeModal(false)}
      />
    </>
  );
};

export default Home;

const useStyles = makeStyles((c) => ({
  cardPlaceholder: {
    height: 260,
    borderRadius: radius.card,
    backgroundColor: c.surface.default,
  },
}));
