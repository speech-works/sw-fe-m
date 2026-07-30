import React, { useCallback, useEffect, useRef, useState } from "react";
import { InteractionManager, RefreshControl, View } from "react-native";
import { getActiveOnboardingFlow } from "../../api/onboarding";
import { getMyUser } from "../../api/users";
import { showSuccessBottomSheet } from "../../util/functions/bottomSheet";
import { loadServerOnboardingAnswers } from "../../util/functions/loadServerOnboardingAnswers";
import SmartRecommendationCard from "../../components/Dashboard/SmartRecommendationCard";
import OnboardingReminderCard from "../../components/OnboardingReminderCard";
import {
  answeredRequiredCount,
  nextUnansweredQuestion,
} from "../../util/onboarding/progress";
import { openOnboarding as openOnboardingFlow } from "../../util/functions/openOnboarding";
import { useMoodCheckStore } from "../../stores/mood";
import { useOnboardingStore } from "../../stores/onboarding";
import { useUserStore } from "../../stores/user";
import MoodCheckPopup from "../Academy/components/MoodCheck/MoodCheckPopup";
import { IdentityBlock } from "./components/IdentityBlock";
import GrowthSummary from "./components/GrowthSummary";
import MoodCheckBanner from "./components/MoodCheckBanner";
import ForYouCarousel from "../../components/Dashboard/ForYouCarousel";
import FirstCallCard from "../../components/Dashboard/FirstCallCard";
import {
  Page,
  Carousel,
  Text,
  useTheme,
  makeStyles,
  space,
  radius,
} from "../../design-system";

const Home = () => {
  const { colors } = useTheme();
  const styles = useStyles();
  const { user, setUser } = useUserStore();
  const { hasRecordedToday } = useMoodCheckStore();

  const onboardingFlow = useOnboardingStore((s) => s.flow);
  const onboardingAnswers = useOnboardingStore((s) => s.answers);

  // COUNTED FROM ANSWERS, NOT FROM A SCREEN NUMBER.
  //
  // This was `currentScreen` against `getTotalScreens()`, with a `: 1` fallback
  // when the flow had not been fetched — so the card could read "Step 13 of 13"
  // with everything unanswered, or "Step 1 of 1" with a full bar. Both promised
  // one tap and delivered thirteen questions, to the people who had already
  // walked away once.
  const { answered: onboardingAnswered, total: onboardingTotal } =
    answeredRequiredCount(onboardingFlow, onboardingAnswers);
  const nextOnboardingQuestion = nextUnansweredQuestion(
    onboardingFlow,
    onboardingAnswers,
  );


  const [interactionsDone, setInteractionsDone] = useState(false);

  // Pagination & Visibility Logic (Derived State)
  //
  // `onboardingTotal > 0` is a correctness guard, not a nicety: the count comes
  // from the cached flow, and someone who left before it was ever fetched has
  // none — which would render "0 of 0 answered" with an empty bar. Better to
  // show nothing for the moment it takes the effect below to fetch it.
  const showOnboarding =
    user && !user.hasCompletedOnboarding && onboardingTotal > 0;
  const showMoodCheck = !hasRecordedToday;

  const cards: string[] = [];
  if (showOnboarding) cards.push("onboarding");

  if (showMoodCheck) cards.push("mood");

  // THE RESUME/START-OVER MODAL IS GONE, deliberately.
  //
  // It asked a question the app can no longer answer. "Start Over" called
  // `startFresh`, which clears LOCAL state only — and now that the resume point
  // is derived from the account's answers, the very next step re-reads them and
  // puts the person back exactly where they were. Keeping a button that looks
  // like it does something and provably does not is worse than not offering it.
  // A genuine restart would mean deleting the account's answers server-side
  // (the endpoint exists) behind a confirm, which is a product decision, not a
  // repair. Resuming is now the only behaviour, and it is the right default.

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      setInteractionsDone(true);
    });
    return () => task.cancel();
  }, []);

  /**
   * MAKE THE CARD'S NUMBER TRUE, including after a reinstall.
   *
   * The count is derived from the flow and the answers, and Home held neither
   * for anybody whose local stores were empty — a fresh install, a second
   * phone, or someone who exited before the flow was ever cached. Without this
   * the card either could not render at all (the guard above) or would
   * under-report what the account has already answered.
   *
   * Ref-guarded and only while the card is warranted, so this is at most one
   * pair of requests per mount and none at all for a finished user.
   */
  const hydratedOnboarding = useRef(false);
  useEffect(() => {
    if (!user || user.hasCompletedOnboarding) return;
    if (hydratedOnboarding.current) return;
    hydratedOnboarding.current = true;

    let cancelled = false;
    (async () => {
      try {
        const flow = await getActiveOnboardingFlow();
        const serverAnswers = await loadServerOnboardingAnswers(user.id, flow);
        if (!cancelled) {
          useOnboardingStore
            .getState()
            .hydrateFromServer(flow, serverAnswers ?? undefined);
        }
      } catch (err) {
        // Silent by design. The card simply stays hidden this session; nothing
        // is broken and nothing is claimed. Surfacing an error for a card the
        // person did not ask for would be noise.
        console.warn("[home] could not load onboarding progress:", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const oldLevel = user?.level;
      const freshUser = await getMyUser();
      setUser(freshUser);

      // Detect regression
      if (
        oldLevel &&
        freshUser.level !== undefined &&
        freshUser.level < oldLevel
      ) {
        // Was `Toast.show`, which rendered NOTHING: the toast root is
        // commented out in App.tsx, so this message has never once been seen.
        // OutcomeModal is mounted and works.
        showSuccessBottomSheet(
          "Level adjusted",
          "Your level settled after a sync — every practice grows it again.",
        );
      }

      setRefreshKey((prev) => prev + 1);
    } catch (error) {
      console.error("Failed to refresh home:", error);
    } finally {
      setRefreshing(false);
    }
  }, [setUser, user?.level]);

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
          answered={onboardingAnswered}
          total={onboardingTotal}
          nextQuestionText={nextOnboardingQuestion?.questionText}
          onPress={() => void openOnboardingFlow("home_card")}
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

        {/* Above the recommendation on purpose. It renders nothing at all once
            the server says the call has been taken, so it only outranks
            "what to do today" for the short window where somebody has a call
            waiting and has never had one — which is exactly the window it is
            for. Quieted, it collapses to a single row and stops competing. */}
        <FirstCallCard key={`first-call-${refreshKey}`} />

        <SmartRecommendationCard key={`rec-${refreshKey}`} />

        {/* The only thing on Home that sells. SmartRecommendationCard above
            keeps "what to do today"; this shows what to consider next. */}
        <ForYouCarousel key={`foryou-${refreshKey}`} />


        {/* ABOVE the carousel and outside it, deliberately. A standing fact
            about what somebody has done should not have to be swiped to, and
            should not sit in a rotation with today's business. It renders
            nothing at all until there is something true to show. */}
        <GrowthSummary key={`growth-${refreshKey}`} />

        {cards.length > 0 ? (
          <Carousel
            data={cards}
            keyExtractor={(c) => c}
            renderItem={({ item }) => renderCard(item)}
          />
        ) : null}
      </Page>

      {interactionsDone && <MoodCheckPopup />}

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
