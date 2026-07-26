import { useNavigation } from "@react-navigation/native";
import { format, isValid, parseISO } from "date-fns";
import React, { useCallback, useEffect, useState } from "react";
import { RefreshControl, View } from "react-native";
import {
  getTodayImpactAssessmentQuestions,
  startImpactAssessmentCollection,
} from "../../api/impactAssessment";
import { getActiveOnboardingFlow } from "../../api/onboarding";
import { getMyUser } from "../../api/users";
import ClinicalStatsWidget from "../../components/Dashboard/ClinicalStatsWidget";
import SmartRecommendationCard from "../../components/Dashboard/SmartRecommendationCard";
import ImpactAssessmentWidget from "../../components/ImpactAssessmentWidget";
import OnboardingReminderCard from "../../components/OnboardingReminderCard";
import { useEventStore } from "../../stores/events";
import { EVENT_NAMES } from "../../stores/events/constants";
import { useMoodCheckStore } from "../../stores/mood";
import { useImpactAssessmentStore } from "../../stores/impactAssessment";
import { useOnboardingStore } from "../../stores/onboarding";
import { useUserStore } from "../../stores/user";
import { useUserBehaviorTrendsStore } from "../../stores/userBehaviorTrends";
import { getLocalTodayDateString } from "../../util/functions/date";
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
  const { user, setUser, fetchUser } = useUserStore();
  const { fetchAllTrends } = useUserBehaviorTrendsStore();
  const { emit } = useEventStore();
  const { hasRecordedToday } = useMoodCheckStore();

  const currentOnboardingScreen = useOnboardingStore((s) => s.currentScreen);
  const onboardingFlow = useOnboardingStore((s) => s.flow);
  const getTotalScreens = useOnboardingStore((s) => s.getTotalScreens);
  const totalOnboardingScreens = onboardingFlow ? getTotalScreens() : 1;

  const navigation = useNavigation<any>();
  const [impactAssessmentProgress, setImpactAssessmentProgress] = useState<{
    dayNumber: number;
    /** Both come from the server — the widget derives its own denominator. */
    totalAnswered: number;
    totalRemaining: number;
  } | null>(null);
  const [, setLoadingImpactAssessment] = useState(true);
  const [forceShowOnboarding, setForceShowOnboarding] = useState(false);

  // Resume Modal State
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [interactionsDone, setInteractionsDone] = useState(false);

  // Pagination & Visibility Logic (Derived State)
  const showOnboarding =
    forceShowOnboarding || (user && !user.hasCompletedOnboarding);
  const showImpactAssessment = !!impactAssessmentProgress && !showOnboarding;
  const showMoodCheck = !hasRecordedToday;

  const cards: string[] = [];
  if (showOnboarding) cards.push("onboarding");
  else if (showImpactAssessment) cards.push("impactAssessment");

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

  // --- Impact Assessment Auto-Start ---
  const initImpactAssessment = useCallback(
    async (forceFetch = false) => {
      if (!user?.hasCompletedOnboarding) {
        setLoadingImpactAssessment(false);
        return;
      }

      try {
        setLoadingImpactAssessment(true);
        // Step 1: Check Cache (Optimized Load)
        const state = useImpactAssessmentStore.getState();
        const todayStr = getLocalTodayDateString();
        const lastFetchedDate = state.lastFetchedAt
          ? parseISO(state.lastFetchedAt)
          : null;
        const lastFetchedStr =
          lastFetchedDate && isValid(lastFetchedDate)
            ? format(lastFetchedDate, "yyyy-MM-dd")
            : null;

        let batch = state.dailyBatch;
        console.log(
          "[Home] Impact Assessment Init Debug - Store Batch:",
          !!batch,
          "Last Fetched:",
          state.lastFetchedAt,
        );

        // If not fetched today, or no batch exists, or forced, fetch from API
        if (forceFetch || todayStr !== lastFetchedStr || !batch) {
          try {
            // Initialize Collection (Idempotent)
            await startImpactAssessmentCollection();
            // Fetch Fresh Batch
            batch = await getTodayImpactAssessmentQuestions();
            // Update Store (timestamp updated in setter)
            state.setDailyBatch(batch);
          } catch (err: any) {
            const errMsg =
              err.response?.data?.message ||
              err.response?.data?.error ||
              err.message;
            console.warn(
              "[Home] Failed to fetch fresh impact assessment data:",
              errMsg,
            );

            if (errMsg?.includes("USER_ONBOARDING_INCOMPLETE")) {
              console.log(
                "[Home] Detected assessment/onboarding desync. Reverting to onboarding.",
              );
              setForceShowOnboarding(true);
              await fetchUser(); // Sync the store with the real state
            }
          }
        }

        // Step 2: Determine visibility.
        //
        // The Home card exists to get the BASELINE finished — the one sitting
        // that fills the Growth Profile. Once that's done the assessment moves
        // to its ONGOING trickle, which belongs after practice, not as a
        // standing task on Home. Hiding the card then is what stops it nagging
        // forever: the old condition needed all 42 answered, which nobody ever
        // reached, so it never hid.
        //
        // `phase` is optional for back-compat: an older server sends none, and
        // we fall back to the previous all-answered rule.
        const phase = batch?.phase;
        const totalRemaining = batch?.metadata?.totalRemaining ?? 0;
        const questionsCount = batch?.questions?.length ?? 0;
        // Progress is measured against the CURRENT phase, so a finished
        // baseline reads 100% rather than ~48% of the whole bank.
        const phaseTarget = batch?.metadata?.phaseTarget;
        const phaseRemaining = batch?.metadata?.phaseRemaining;
        const totalAnswered =
          phaseTarget !== undefined && phaseRemaining !== undefined
            ? phaseTarget - phaseRemaining
            : (batch?.metadata?.totalAnswered ?? 0);

        const baselineDone = phase ? phase !== "BASELINE" : false;
        const isActuallyDone =
          !!batch &&
          (baselineDone ||
            (batch.isComplete && totalRemaining === 0 && questionsCount === 0));

        if (isActuallyDone) {
          console.log("[Home] Baseline assessment done. Hiding card.", { phase });
          setImpactAssessmentProgress(null);
          return;
        }

        // Step 3: Show widget if there are current questions OR if more remain for future days
        // Or if batch is missing (fresh post-onboarding), show as Day 1
        const safeDay = batch?.dayNumber || 1;
        console.log("[Home] Impact Assessment Progress Setting:", {
          safeDay,
          totalAnswered,
          totalRemaining,
        });
        setImpactAssessmentProgress({
          dayNumber: safeDay,
          totalAnswered,
          // Remaining IN THIS PHASE, so the card counts down to the end of the
          // baseline sitting rather than to the bottom of the 42-item bank.
          totalRemaining: phaseRemaining ?? totalRemaining,
        });
      } catch (error: any) {
        console.error("[Home] initImpactAssessment Error:", error);
        const errMsg = error.message || String(error);
        if (!errMsg.includes("USER_ONBOARDING_INCOMPLETE")) {
          Toast.show({
            type: "error",
            text1: "Assessment update failed",
            text2:
              "We couldn't refresh your assessment progress. Swipe down to try again.",
          });
        }
        setImpactAssessmentProgress(null);
      } finally {
        setLoadingImpactAssessment(false);
      }
    },
    [user?.hasCompletedOnboarding, fetchUser],
  );

  useEffect(() => {
    initImpactAssessment();
  }, [initImpactAssessment]);

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

      // Trigger impact assessment refresh if user is post-onboarding
      if (freshUser.hasCompletedOnboarding) {
        await initImpactAssessment(true);
      }

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
  }, [fetchAllTrends, initImpactAssessment, setUser, user?.level]);

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
    if (cardType === "impactAssessment") {
      return (
        <ImpactAssessmentWidget
          totalAnswered={impactAssessmentProgress?.totalAnswered}
          totalRemaining={impactAssessmentProgress?.totalRemaining}
          onPress={() => {
            navigation.navigate("ExploreStack", {
              screen: "DailyPracticeStack",
              params: { screen: "ImpactAssessmentIntro" },
            });
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
