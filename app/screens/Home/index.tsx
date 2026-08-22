import React, { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { InteractionManager, RefreshControl, View } from "react-native";
import { getActiveOnboardingFlow } from "../../api/onboarding";
import { getMyUser } from "../../api/users";
import { showSuccessBottomSheet } from "../../util/functions/bottomSheet";
import { loadServerOnboardingAnswers } from "../../util/functions/loadServerOnboardingAnswers";
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
import NotificationPermissionPrompt from "../../components/NotificationPermissionPrompt";
import { IdentityBlock } from "./components/IdentityBlock";
import ReachRow from "./components/ReachRow";
import {
  WaitingGoalCard,
  isDismissedToday,
} from "./components/WaitingGoalCard";
import { getReachSummary } from "../../api/programGoals";
import { ReachSummary } from "../../api/programGoals/types";
import MoodCheckBanner from "./components/MoodCheckBanner";
import ForYouCarousel from "../../components/Dashboard/ForYouCarousel";
import FirstCallCard, {
  guessFirstCallShape,
  type FirstCallShape,
} from "../../components/Dashboard/FirstCallCard";
import { useFirstCallStore } from "../../stores/firstCall";
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

  /**
   * THE FIRST CALL LIVES IN THE NUDGE CAROUSEL — BOTH OF ITS SHAPES.
   *
   * It is a 260pt card for a once-in-a-lifetime offer, and the loud shape used
   * to sit on top of the programs shelf — the only thing on Home that sells —
   * pushing its price and CTA behind the tab dock for every new user, who is
   * exactly the person we most want to reach.
   *
   * BOTH SHAPES ARE SLIDES. The offer has one address, and deferring only
   * changes how loud it is there — the hero is an amber fill, the quiet card is
   * a neutral surface with a ringing watermark, and both are the same 260pt
   * `PromoCard` shape as the mood nudge beside them.
   *
   * An earlier pass had the quiet shape as a compact row pinned inline above the
   * shelf, which meant saying "not now" promoted the card up the page; a later
   * one moved that row to the very bottom, which fixed the promotion but left
   * two different objects in two different places for one offer. Same slot, two
   * volumes, is the version that is both correct and learnable.
   *
   * The shape is guessed synchronously from the same two stores the card reads,
   * so the layout does not wait on a request; `onShapeChange` corrects it if the
   * server says there is nothing to offer.
   */
  const deferredAt = useFirstCallStore((s) => s.deferredAt);
  const [serverFirstCallShape, setServerFirstCallShape] =
    useState<FirstCallShape | null>(null);
  const firstCallShape =
    serverFirstCallShape ??
    guessFirstCallShape({ takenAt: user?.firstCallTakenAt, deferredAt });

  /**
   * ONE FETCH, TWO SURFACES.
   *
   * Home owns this rather than each component fetching for itself, for the
   * reason the For-you shelf already learned the hard way: a card that reserves
   * space and then renders null costs the fold. The waiting-goal card is only
   * pushed into the rotation once we KNOW there is a goal to put in it, so a
   * user with none never has a slot held open for one.
   *
   * ReachRow reads the same object, so the row and the card can never disagree
   * about what is outstanding.
   */
  const [reach, setReach] = useState<ReachSummary | null>(null);
  const [waitingHidden, setWaitingHidden] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      void (async () => {
        try {
          const summary = await getReachSummary();
          if (!alive) return;
          setReach(summary);
          // "Still not yet" hides it for the rest of the day. Checked here so
          // the card is never pushed and then withdrawn on the next frame.
          const goal = summary.oldestWaiting;
          setWaitingHidden(!goal || (await isDismissedToday(goal.id)));
        } catch {
          /* Both surfaces are absent rather than broken. */
        }
      })();
      return () => {
        alive = false;
      };
    }, []),
  );

  const cards: string[] = [];
  if (showOnboarding) cards.push("onboarding");

  // Before the mood check: the call is a standing offer that expires with the
  // account, the mood check is a thing to do today. Today's business goes last
  // because it comes back tomorrow.
  if (firstCallShape !== "none") cards.push("firstCall");

  // Before the mood check, after the call, for the same reason the call is:
  // this is a standing thing about their life, and the mood check is today's
  // business that comes back tomorrow.
  if (reach?.oldestWaiting && !waitingHidden) cards.push("goal");

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
          "Your level settled after a sync. Every practice grows it again.",
        );
      }

      setRefreshKey((prev) => prev + 1);
    } catch (error) {
      console.error("Failed to refresh home:", error);
    } finally {
      setRefreshing(false);
    }
  }, [setUser, user?.level]);

  // Pull-to-refresh remounts the card (via its key) and it re-asks the server,
  // so drop the last answer and fall back to the synchronous guess until the
  // new one lands.
  useEffect(() => {
    setServerFirstCallShape(null);
  }, [refreshKey]);

  const currentHour = new Date().getHours();
  const greeting =
    currentHour < 12
      ? "Good Morning,"
      : currentHour < 18
        ? "Good Afternoon,"
        : "Good Evening,";
  const firstName = user?.name ? user.name.split(" ")[0] : "";

  const renderCard = (cardType: string) => {
    if (cardType === "firstCall") {
      return (
        <FirstCallCard
          key={`first-call-${refreshKey}`}
          onShapeChange={setServerFirstCallShape}
        />
      );
    }
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
    if (cardType === "goal" && reach?.oldestWaiting) {
      return (
        <WaitingGoalCard
          key={`goal-${reach.oldestWaiting.id}`}
          goal={reach.oldestWaiting}
          onDone={() => setWaitingHidden(true)}
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

        {/* ── ONE ROW ABOUT PROGRAMS, NOT TWO ───────────────────────────────
            SmartRecommendationCard used to sit here, above the shelf, carrying
            the program somebody was in the middle of. Two stacked rows about
            programs, the taller one on top — so the thing you could buy was
            pushed off the fold by the thing you already own.

            The shelf leads with the active program now, then the ranked offers,
            then the way into the shop. When there is no active program the top
            recommendation leads instead, and when there is nothing to
            recommend the shelf shows its own card. See ForYouCarousel. */}
        <ForYouCarousel key={`foryou-${refreshKey}`} />


        {/* ABOVE the carousel and outside it, deliberately. A standing fact
            about what somebody has done should not have to be swiped to, and
            should not sit in a rotation with today's business. It renders
            nothing at all until there is something true to show. */}
        <ReachRow key={`reach-${refreshKey}`} summary={reach} />

        {cards.length > 0 ? (
          <Carousel
            data={cards}
            keyExtractor={(c) => c}
            // Runs the peeking card off the screen edge instead of stopping it
            // a gutter short — a card clipped by page padding reads as a
            // mistake, not as "there's more this way". Collapses itself when
            // there's only one card, which is most days.
            bleedRight={space.screenX}
            renderItem={({ item }) => renderCard(item)}
          />
        ) : null}

      </Page>

      {interactionsDone && <MoodCheckPopup />}
      {/* Renderless. Gated on the same interactionsDone so it can't ask while
          Home is still settling, and it stands down if MoodCheckPopup (or
          anything else) took the moment first. */}
      {interactionsDone && <NotificationPermissionPrompt />}

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
