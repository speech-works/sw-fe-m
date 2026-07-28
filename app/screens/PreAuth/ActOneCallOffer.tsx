import { useNavigation } from "@react-navigation/native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CallerPreview, fetchCallerPreviews } from "../../api/firstCall";
import ScreenView from "../../components/ScreenView";
import {
  Button,
  SchemeStatusBar,
  Sheet,
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
import CallerStage from "../../components/stage/CallerStage";

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
  const [signupOpen, setSignupOpen] = useState(false);
  /**
   * Navigation is deferred to the sheet's `onDismissed`, never fired while it
   * is open. The sheet is a native Modal, and pushing a screen underneath one
   * leaves it lingering over the new screen — on iOS a second stacked native
   * Modal freezes touches app-wide.
   */
  const goingToAuth = useRef(false);
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
          <CallerStage available={stageHeight} icon={caller.icon} />
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
            {/* ONE supporting line, doing both jobs the screen needs: who is
                ringing, and what about. It replaced a chip on the stage plus a
                three-item middot list — a feature list on a screen that should
                read as an invitation. Three promises are not three times as
                persuasive as one; they are just three things to get through. */}
            <Text variant="h3" color="secondary">
              {caller.callerDesignation}
              {phrase ? `, about ${phrase}.` : "."}
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
          <Button
            label="I'll take the call"
            onPress={() => {
              track(ANALYTICS_EVENTS.FIRST_CALL_PRESIGNUP_ACCEPTED, {
                action: act,
                callerName: caller.callerName,
              });
              setSignupOpen(true);
            }}
          />
        </Animated.View>

        {/* A TEXT LINK, NOT A SECOND BUTTON — see the note on the same decision
            in ActOneWelcome. Declining is the exception, so it should look like
            one, and it costs nothing: Home offers the call afterwards exactly
            as it does today. */}
        <Animated.View entering={motion.stagger(4)}>
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

      </View>

      {/*
        THE ACCOUNT STEP, EXPLAINED AT THE MOMENT IT MATTERS.

        It replaced a caption sitting under the button ("Account first, then
        Omar rings.") — read by nobody, because a footnote is what people skip
        on the way to the thing they already decided to tap.

        The reason it gives is the TRUE one, and it happens to be the most
        reassuring thing we can say: their answers really are still on this
        phone. Nothing has been sent anywhere. That is a fact about our
        restraint, not a feature pitch, and it makes the account a way to keep
        something of theirs rather than a toll on the way to the call.

        "So we can track your progress" was the obvious line and it is the
        weaker one — it explains what WE get.
      */}
      <Sheet
        visible={signupOpen}
        onClose={() => setSignupOpen(false)}
        onDismissed={() => {
          if (!goingToAuth.current) return;
          goingToAuth.current = false;
          acceptPreSignup();
          navigation.navigate("Auth");
        }}
      >
        <View style={styles.sheet}>
          <Text variant="h2" color="primary">
            Before {caller.callerName} calls
          </Text>

          <Text variant="body" color="secondary">
            Your answers are on this phone and nowhere else — we haven&apos;t
            sent them anywhere. Making an account is what carries them over, so
            the call is about what you actually told us.
          </Text>

          <Text variant="body" color="secondary">
            It is also what lets this one count, instead of being a one-off you
            have nothing to show for.
          </Text>

          <Text variant="caption" color="tertiary">
            Google or Apple — there is no form to fill in.
          </Text>

          <Button
            label="Create my account"
            onPress={() => {
              goingToAuth.current = true;
              setSignupOpen(false);
            }}
          />

          <Text
            variant="bodySm"
            color="secondary"
            center
            style={styles.sheetCancel}
            onPress={() => setSignupOpen(false)}
          >
            Not yet
          </Text>
        </View>
      </Sheet>
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
  sheet: {
    gap: space.groupGap,
  },
  sheetCancel: {
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.md,
  },
});
