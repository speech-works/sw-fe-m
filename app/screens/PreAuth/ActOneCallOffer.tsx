import { useNavigation } from "@react-navigation/native";
import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CallerPreview, fetchCallerPreviews } from "../../api/firstCall";
import ScreenView from "../../components/ScreenView";
import {
  Button,
  SchemeStatusBar,
  Text,
  space,
  spacing,
  useMotion,
} from "../../design-system";
import { SITUATION_PHRASE } from "../../constants/onboardingActOne";
import { useFirstCallStore } from "../../stores/firstCall";
import { useOnboardingDraftStore } from "../../stores/onboardingDraft";
import { ANALYTICS_EVENTS } from "../../util/analytics/analyticsEvents";
import { track } from "../../util/analytics/postHog";
import CallerStage from "./CallerStage";

/**
 * ============================================================================
 * "MAYA WOULD LIKE TO CALL YOU" — the last screen before signup
 * ----------------------------------------------------------------------------
 * Act 1 earns a signup by showing we listened. This screen asks for one by
 * offering something worth having, and it is the only thing standing between
 * the questions and the account.
 *
 * IT IS BUILT ON THE WELCOME SCREEN'S COMPOSITION, deliberately and down to the
 * numbers: illustration floating at the top in a flex slot that absorbs the
 * slack, a bottom-anchored text block landing hard on the CTA, then a
 * screenTitle / h3 / caption ladder. That stacking is what gives those screens
 * their weight, and this is the third page of one sequence — a different
 * arrangement here would read as a different app.
 *
 * ONE PILL, NOT TWO. An earlier version stacked "I'll take the call" and "Not
 * right now" as two full-width buttons, which is precisely the mistake
 * ActOneWelcome documents fixing: two things of equal visual weight and no
 * obvious path. The decline is a text link, because it is the exception.
 *
 * WHY IT INTRIGUES, WITHOUT LYING:
 *   · It names a PERSON. "A free AI call" is a feature; "Maya, a friend of a
 *     friend, would like to call you" is an event with somebody in it.
 *   · The bubble on the stage carries THEIR OWN answer, one screen after they
 *     gave it — the same trick the teaser plays, and the proof we listened.
 *   · It removes the part they dread: they are not dialling, they are picking
 *     up. Deciding to make a call is very often the hardest part of one.
 *   · It promises the thing nobody promises them: nobody will mention how they
 *     sound.
 *
 * WHAT IT DOES NOT DO is fake a ringing phone to bait a signup. The pulse says
 * "incoming"; the copy says the account comes first. A ring that turns out to
 * be a login wall is a trick, and somebody who has just been told nobody here
 * will judge how they speak is the last person to play one on.
 *
 * NOTHING PERSONAL LEAVES THE DEVICE. The caller is chosen locally from the
 * public `GET /callers` cast using answers that stay put — the promise
 * `stores/onboardingDraft` makes, and the reason this is not a lookup.
 * ============================================================================
 */

/** Mirrors the server's own preference: the act they meet MOST, else the first
 *  one they called hardest. Same order, so the name here is the name that
 *  rings. */
function targetAct(answers: Record<string, string | string[]>): string | null {
  const real = (v: unknown): v is string =>
    typeof v === "string" && v !== "none" && v !== "not_sure";

  const freq = answers["situation.most_frequent"];
  if (real(freq)) return freq;

  const raw = answers["speech.situations"];
  const picked = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return picked.find(real) ?? null;
}

const ActOneCallOffer: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const motion = useMotion();

  const answers = useOnboardingDraftStore((s) => s.answers);
  const acceptPreSignup = useFirstCallStore((s) => s.acceptPreSignup);

  const [cast, setCast] = useState<CallerPreview[] | null>(null);
  /** Measured height of the illustration slot — see the note in WelcomeStage. */
  const [stageHeight, setStageHeight] = useState(0);

  useEffect(() => {
    let alive = true;
    fetchCallerPreviews().then((c) => alive && setCast(c));
    return () => {
      alive = false;
    };
  }, []);

  const act = useMemo(() => targetAct(answers), [answers]);

  const caller = useMemo(() => {
    if (!cast?.length) return null;
    // The fallback carries an act of its own (open_chat — that is genuinely
    // what Sofia's no-agenda call is), so matching without excluding it would
    // pick between two entries by array order. Same rule the server uses, so
    // the name promised here is the name that rings.
    const matchable = cast.filter((c) => !c.isDefault);
    return (
      (act ? matchable.find((c) => c.action === act) : undefined) ??
      cast.find((c) => c.isDefault) ??
      cast[0]
    );
  }, [cast, act]);

  useEffect(() => {
    if (caller) {
      track(ANALYTICS_EVENTS.FIRST_CALL_PRESIGNUP_SHOWN, {
        action: act,
        callerName: caller.callerName,
      });
    }
  }, [caller, act]);

  // The cast could not be fetched (offline, or the endpoint is down). Rather
  // than an apology for a feature they have never heard of, this simply is not
  // offered — they go on to signup, and Home offers the call later exactly as
  // it does for anyone who says "not right now" here. Nothing is lost.
  useEffect(() => {
    if (cast !== null && !caller) navigation.replace("Auth");
  }, [cast, caller, navigation]);

  if (!caller) return null;

  const phrase = act ? SITUATION_PHRASE[act] : null;

  return (
    <ScreenView style={styles.screen}>
      <SchemeStatusBar />

      {/* ILLUSTRATION FIRST, then the words — the arrangement the welcome
          screen settled on. The caller is doing the introducing; the copy
          explains what the picture showed. */}
      <View style={[styles.body, { paddingTop: insets.top + spacing.lg }]}>
        <Animated.View
          style={styles.stageSlot}
          entering={motion.stagger(0)}
          onLayout={(e) => setStageHeight(e.nativeEvent.layout.height)}
        >
          <CallerStage
            available={stageHeight}
            icon={caller.icon}
            about={phrase}
          />
        </Animated.View>

        <View style={styles.copyBlock}>
          <Animated.View entering={motion.stagger(1)}>
            {/* Hard-broken to two lines at the same tightened leading as
                "Everyone has / a list." — a stacked block is a stronger shape
                than one long run, and the two screens are meant to rhyme.
                Anything that changes this string must re-check the break. */}
            <Text variant="screenTitle" style={styles.headline}>
              {caller.callerName} would{"\n"}like to call you.
            </Text>
          </Animated.View>

          <Animated.View entering={motion.stagger(2)}>
            {/* Who they are, in one line. What the call is ABOUT rides on the
                bubble above; saying it in both places turned this tier into a
                paragraph, and every other screen in Act 1 holds it to one
                line. */}
            <Text variant="h3" color="secondary">
              {caller.callerDesignation}.
            </Text>
          </Animated.View>

          {/* THE FACTS, DEMOTED — the same treatment, and the same middot rule,
              as "5 questions · about a minute" next door. Each one removes a
              specific reason to say no, and as tertiary text they scan in a
              glance instead of reading as three more things to get through. */}
          <Animated.View entering={motion.stagger(3)}>
            <Text variant="caption" color="tertiary">
              You pick up · nothing to prepare · nobody mentions how you sound
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
        <Animated.View entering={motion.stagger(4)}>
          <Button
            label="I'll take the call"
            onPress={() => {
              track(ANALYTICS_EVENTS.FIRST_CALL_PRESIGNUP_ACCEPTED, {
                action: act,
                callerName: caller.callerName,
              });
              acceptPreSignup();
              navigation.navigate("Auth");
            }}
          />
        </Animated.View>

        {/* A TEXT LINK, NOT A SECOND BUTTON — see the note on the same decision
            in ActOneWelcome. Declining is the exception, so it should look like
            one, and it costs nothing: Home offers the call afterwards exactly
            as it does today. */}
        <Animated.View entering={motion.stagger(5)}>
          <Text
            variant="bodySm"
            color="secondary"
            center
            style={styles.declineRow}
            onPress={() => {
              track(ANALYTICS_EVENTS.FIRST_CALL_PRESIGNUP_DECLINED, {
                action: act,
              });
              navigation.navigate("Auth");
            }}
          >
            Not right now
          </Text>
        </Animated.View>

        {/* Said BEFORE the tap, not discovered after it. */}
        <Animated.View entering={motion.stagger(6)}>
          <Text variant="caption" color="tertiary" center style={styles.noteRow}>
            One conversation, once. We&apos;ll set your account up first, then{" "}
            {caller.callerName} rings.
          </Text>
        </Animated.View>
      </View>
    </ScreenView>
  );
};

export default ActOneCallOffer;

// Geometry copied from ActOneWelcome rather than re-derived — the two screens
// are the same lockup with a different picture in it, and the only way that
// stays true is to share the numbers.
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
  declineRow: {
    paddingTop: spacing["2xl"],
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  noteRow: {
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.md,
  },
});
