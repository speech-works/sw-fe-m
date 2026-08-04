import { useNavigation } from "@react-navigation/native";
import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getActiveOnboardingFlow } from "../../api/onboarding";
import ScreenView from "../../components/ScreenView";
import WelcomeStage from "../PreAuth/WelcomeStage";
import {
  OnboardingStackNavigationProp,
  OnboardingStackParamList,
} from "../../navigators/stacks/OnboardingStack/types";
import { useOnboardingStore } from "../../stores/onboarding";
import {
  Button,
  IconButton,
  icons,
  SchemeStatusBar,
  space,
  spacing,
  Text,
  useMotion,
} from "../../design-system";
import { track } from "../../util/analytics/postHog";
import { ANALYTICS_EVENTS } from "../../util/analytics/analyticsEvents";
import { useUserStore } from "../../stores/user";
import { SITUATION_PHRASE } from "../../constants/onboardingActOne";
import { loadServerOnboardingAnswers } from "../../util/functions/loadServerOnboardingAnswers";
import { showErrorBottomSheet } from "../../util/functions/bottomSheet";
import { apiErrorMessage } from "../../util/functions/apiError";
import { useEventStore } from "../../stores/events";
import { EVENT_NAMES } from "../../stores/events/constants";

/**
 * The post-signup half of onboarding — the same process, continued.
 *
 * IT IS THE ACT 1 WELCOME SCREEN'S SKELETON, deliberately: the character on its
 * blob, a screenTitle headline at 40 leading over an h3 subtitle, left aligned,
 * CTA at the bottom. Before this it was two lines of `display` text floating in
 * a centred block with no illustration at all, so crossing the signup boundary
 * felt like arriving in a different app halfway through one questionnaire.
 *
 * THE BUBBLES CARRY THEIR OWN ANSWERS when there are any. Someone who came
 * through Act 1 sees the situations they picked sixty seconds ago, so this
 * reads as "still going" rather than "starting again". Someone who signed in
 * directly — a reinstall, a returning account — never saw Act 1, so they get
 * the sample three, exactly as the opening screen shows them.
 */
const OnboardingWelcome: React.FC = () => {
  const motion = useMotion();
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<
      OnboardingStackNavigationProp<keyof OnboardingStackParamList>
    >();
  const { enterFlow, answers } = useOnboardingStore();
  const user = useUserStore((s) => s.user);
  const { emit } = useEventStore();
  const [stageHeight, setStageHeight] = useState(0);
  // Continue now makes two network calls, so it needs a visible busy state —
  // and a guard, since a double tap would fire two flow fetches and two
  // navigates.
  const [starting, setStarting] = useState(false);

  /**
   * Is this a repair rather than a first run?
   *
   * The cleanup migration reset onboarding for every account whose stored
   * answers were the old unreadable tokens. Those people already have history
   * here, so an account older than a day that is somehow "not onboarded" is
   * one of them — a genuinely new user reaches this screen within minutes of
   * signing up. Erring toward the plain welcome: if the timestamp is missing we
   * treat it as a first run.
   */
  const isReask = (() => {
    const created = user?.createdAt ? new Date(user.createdAt).getTime() : null;
    if (!created || Number.isNaN(created)) return false;
    return Date.now() - created > 24 * 60 * 60 * 1000;
  })();

  /**
   * Their Act 1 situations, if the replay seeded them.
   *
   * `undefined` rather than `[]` when there are none — that distinction is
   * load-bearing in WelcomeStage: undefined means "show the samples", an empty
   * array means "show no bubbles at all". Someone who never did Act 1 should
   * see the samples, not an empty stage.
   */
  const ownSituations = (() => {
    const raw = answers?.["speech.situations"];
    const chosen = Array.isArray(raw) ? raw : raw ? [raw] : [];
    const phrases = chosen
      .map((v) => SITUATION_PHRASE[String(v)])
      .filter(Boolean) as string[];
    return phrases.length > 0 ? phrases.slice(0, 3) : undefined;
  })();

  /**
   * THIS USED TO DESTROY EVERY PRE-SIGNUP ANSWER.
   *
   * It called `startFresh(fetched)` unconditionally — which sets `answers: {}`
   * and `currentScreen` back to the first screen — and then hard-navigated to
   * `screenNumber: 1`. The replay had just seeded the five Act 1 answers and
   * computed a resume point of screen 6, and both were thrown away the instant
   * the reader tapped the button. All twelve questions were then asked,
   * including the five they had answered sixty seconds earlier. Two separate
   * causes, and either alone was enough: the wipe, and the hardcoded 1.
   *
   * Now this screen makes no decision at all — `enterFlow` owns it, where it is
   * reachable from a test. This fetches, delegates, and navigates to whatever
   * screen it is handed. The literal `1` is gone: the question screen navigates
   * by route param, so passing a constant there overrode whatever was computed.
   */
  const handleStart = async () => {
    track(ANALYTICS_EVENTS.ONBOARDING_STARTED);
    if (starting) return;
    setStarting(true);
    try {
      const fetched = await getActiveOnboardingFlow();

      // The account's own answers decide where to resume — see
      // loadServerOnboardingAnswers. Best effort: a null result simply means
      // `enterFlow` falls back to local state, exactly as it did before.
      const serverAnswers = await loadServerOnboardingAnswers(
        user?.id,
        fetched,
      );

      navigation.navigate("OnboardingQuestion", {
        screenNumber: enterFlow(fetched, serverAnswers ?? undefined),
      });
    } catch (err) {
      // Was a bare console.error, which left the screen's ONLY button inert
      // with no feedback and no way out — a hard lock for anyone opening the
      // app offline.
      console.error("Failed to load onboarding flow:", err);
      showErrorBottomSheet(
        "We couldn't load your questions",
        apiErrorMessage(err, "Check your connection and try again."),
      );
    } finally {
      setStarting(false);
    }
  };

  return (
    <ScreenView style={styles.screen}>
      <SchemeStatusBar />

      {/* THE ONLY WAY OUT. This screen had one button and no exit, with
          `gestureEnabled: false` — so when the flow fetch failed (offline, a
          500, an expired token) the button did nothing and the app had no other
          reachable screen. Deleting and reinstalling was the only recovery.
          Skipping is honoured permanently now, so leaving is a real choice
          rather than a one-session reprieve. */}
      <View style={[styles.exitRow, { paddingTop: insets.top + spacing.lg }]}>
        <IconButton
          name={icons.close}
          onPress={() => emit(EVENT_NAMES.STOP_ONBOARDING)}
          variant="control"
          accessibilityLabel="Answer these later"
        />
      </View>

      <View style={[styles.body, { paddingTop: spacing.lg }]}>
        {/* The slot measures itself and hands its height to the illustration —
            see the note on `sizes()` in WelcomeStage for why this is measured
            rather than derived from the window. */}
        <Animated.View
          style={styles.stageSlot}
          entering={motion.stagger(0)}
          onLayout={(e) => setStageHeight(e.nativeEvent.layout.height)}
        >
          <WelcomeStage available={stageHeight} labels={ownSituations} />
        </Animated.View>

        <View style={styles.copyBlock}>
          <Animated.View entering={motion.stagger(1)}>
            {/* Hard-broken to two lines so the lockup matches "Everyone has /
                a list." on the opening screen — same variant, same 40 leading,
                same left edge.

                RETURNING USER WHOSE ANSWERS WERE UNREADABLE. A cleanup
                migration reset onboarding for accounts whose stored answers
                were the old random tokens — nothing about them could be
                decoded. Dropping those people at a generic welcome would read
                as the app having lost them, so this names what happened: our
                fix, not their mistake. */}
            <Text variant="screenTitle" style={styles.headline}>
              {isReask
                ? "A better match,\nin a minute."
                : "A few more,\nand we're set."}
            </Text>
          </Animated.View>

          <Animated.View entering={motion.stagger(2)}>
            <Text variant="h3" color="secondary">
              {isReask
                ? "We've improved how we match programs to people. Yours will fit properly."
                : "The rest of the picture: how speaking actually feels for you."}
            </Text>
          </Animated.View>
        </View>
      </View>

      <View
        style={[
          styles.footer,
          { paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.md },
        ]}
      >
        {/* "Continue", not "Start" — this is the middle of one process, and the
            reader has already started. */}
        <Animated.View entering={motion.stagger(3)}>
          <Button
            label="Continue"
            onPress={handleStart}
            loading={starting}
            disabled={starting}
          />
        </Animated.View>
      </View>
    </ScreenView>
  );
};

export default OnboardingWelcome;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 0,
  },
  // Sits above the body so the illustration keeps its own vertical rhythm.
  exitRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: space.screenX,
  },
  body: {
    flex: 1,
    justifyContent: "flex-start",
    // paddingTop is applied inline from the safe-area inset.
    paddingHorizontal: space.screenX,
    gap: space.groupGap,
    paddingBottom: space.groupGap,
  },
  // Absorbs the slack so the illustration floats up top and the text block
  // lands against the CTA — the stacking that gives ActOneWelcome its weight.
  stageSlot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  copyBlock: {
    gap: space.inlineGap,
  },
  headline: {
    lineHeight: 40,
  },
  footer: {
    paddingHorizontal: space.screenX,
  },
});
