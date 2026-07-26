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
  const { startFresh, answers } = useOnboardingStore();
  const user = useUserStore((s) => s.user);
  const [stageHeight, setStageHeight] = useState(0);

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

  const handleStart = async () => {
    track(ANALYTICS_EVENTS.ONBOARDING_STARTED);
    try {
      const fetched = await getActiveOnboardingFlow();
      startFresh(fetched);
      navigation.navigate("OnboardingQuestion", { screenNumber: 1 });
    } catch (err) {
      console.error("Failed to load onboarding flow:", err);
    }
  };

  return (
    <ScreenView style={styles.screen}>
      <SchemeStatusBar />

      <View style={[styles.body, { paddingTop: insets.top + spacing.lg }]}>
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
                : "The rest of the picture — how speaking actually feels for you."}
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
          <Button label="Continue" onPress={handleStart} />
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
