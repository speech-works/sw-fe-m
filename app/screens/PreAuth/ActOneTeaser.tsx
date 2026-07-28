import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ScreenView from "../../components/ScreenView";
import WelcomeStage from "./WelcomeStage";
import {
  Button,
  SchemeStatusBar,
  Text,
  space,
  spacing,
  useMotion,
} from "../../design-system";
import { useOnboardingDraftStore } from "../../stores/onboardingDraft";
import { SITUATION_PHRASE } from "../../constants/onboardingActOne";

/** "phone calls, meeting new people and interviews" — an Oxford-comma-free list. */
function joinPhrases(list: string[]): string {
  if (list.length === 0) return "";
  if (list.length === 1) return list[0];
  return `${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}`;
}

/**
 * The last screen before signup — and the payoff for the five questions.
 *
 * IT IS THE WELCOME SCREEN, FILLED IN. Same character, same blob, same three
 * bubbles in the same places — except the bubbles now carry the reader's own
 * answers instead of the samples they opened on. That is the whole idea: the
 * first screen showed somebody else's list, this one shows theirs, and holding
 * the composition still is what makes the swap land. A different layout here
 * would read as a different screen rather than as an answer to the first one.
 *
 * It replaces a version that was a headline, a bordered white card, and a
 * third of a screen of nothing. That version stated the recognition in prose
 * ("You said phone calls feel hardest") while showing no evidence of it; the
 * bubbles ARE the evidence, so the card is gone and the copy got shorter.
 *
 * THIS SCREEN DOES NOT SELL. It names no program, no price, no urgency.
 * Naming one would change the question in the reader's head from "they
 * understood me" to "do I want to buy this" — a much worse question to be
 * asking someone who has known us for sixty seconds. Act 1 exists to earn a
 * signup made WITH INTENT; the buying decision belongs later, against a real
 * priced personalised match.
 *
 * (There is a second, independent reason it would also be unsafe: the real
 * match comes from `GET /users/me/offers`, which requires an account, so
 * computing one here would mean duplicating the ranking and the pricing into
 * the app where they can drift and quote a number we do not charge —
 * `app/util/packs/offers.ts` opens with the story of that exact bug. If that
 * endpoint were ever opened up, the product reason above still stands alone.)
 */
const ActOneTeaser: React.FC = () => {
  const motion = useMotion();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const answers = useOnboardingDraftStore((s) => s.answers);
  const [stageHeight, setStageHeight] = useState(0);

  const raw = answers["speech.situations"];
  const chosen = Array.isArray(raw) ? raw : raw ? [raw] : [];
  // NONE / NOT_SURE carry no targeting information, so they are never echoed.
  const phrases = chosen
    .map((v) => SITUATION_PHRASE[String(v)])
    .filter(Boolean) as string[];

  const named = joinPhrases(phrases.slice(0, 3));

  return (
    <ScreenView style={styles.screen}>
      <SchemeStatusBar />

      <View style={[styles.body, { paddingTop: insets.top + spacing.lg }]}>
        <Animated.View
          style={styles.stageSlot}
          entering={motion.stagger(0)}
          onLayout={(e) => setStageHeight(e.nativeEvent.layout.height)}
        >
          {/* An empty array, not undefined, when they named nothing — see the
              note on `labels`. Someone who chose "None of these" must not be
              shown the sample situations as though they had picked them. */}
          <WelcomeStage
            available={stageHeight}
            labels={phrases.slice(0, 3)}
            face="face.joy"
          />
        </Animated.View>

        {/* TWO TIERS, matching the welcome screen's TYPE SCALE (screenTitle at
            40 leading, h3 secondary) without matching its TIER COUNT. Matching
            the welcome screen means using the same sizes when text is there,
            not manufacturing a third line to hit the same number of rows.

            A caption-tier reassurance line used to sit here ("You won't have to
            answer them again"). Cut: it existed to fill the tier, not to tell
            the reader anything they'd asked. Text that answers no question is
            the thing that makes a clean screen start to feel busy. */}
        <View style={styles.copyBlock}>
          <Animated.View entering={motion.stagger(1)}>
            {/* A RESPONSE, not a summary. "That's a good place to start" was
                the app appraising the reader's answer; this is the app
                answering it. Understated on purpose — someone who has just
                named the moments they dread is better met with quiet
                competence than with enthusiasm.

                Hard-broken to two lines so the lockup matches "Everyone has /
                a list." on the opening screen. */}
            <Text variant="screenTitle" style={styles.headline}>
              We can work{"\n"}with that.
            </Text>
          </Animated.View>

          <Animated.View entering={motion.stagger(2)}>
            {/* The bubbles overhead already say WHICH moments, so this says the
                one thing the picture cannot: what happens with them next. */}
            <Text variant="h3" color="secondary">
              {named
                ? "Your first plan starts with these."
                : "Your first plan starts with the everyday moments."}
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
        <Animated.View entering={motion.stagger(3)}>
          {/* Was "Create an account", which asked for the commitment before
              offering anything for it. The call offer sits next; the account
              is asked for there, once there is a reason to make one. */}
          <Button
            label="Continue"
            onPress={() => navigation.navigate("ActOneCallOffer")}
          />
        </Animated.View>
      </View>
    </ScreenView>
  );
};

export default ActOneTeaser;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 0,
  },
  body: {
    flex: 1,
    justifyContent: "flex-start",
    paddingHorizontal: space.screenX,
    gap: space.groupGap,
    paddingBottom: space.groupGap,
  },
  // Absorbs the slack and measures itself, so the illustration fills whatever
  // the copy and footer leave over — see the note on `sizes()` in WelcomeStage.
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
