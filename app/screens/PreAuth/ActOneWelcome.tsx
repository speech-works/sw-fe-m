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
  Sheet,
  Text,
  Toggle,
  space,
  spacing,
  radius,
  useMotion,
  useTheme,
} from "../../design-system";
import { useAnalyticsConsentStore } from "../../stores/analyticsConsent";
import { useOnboardingDraftStore } from "../../stores/onboardingDraft";
import { applyAnalyticsConsent, track } from "../../util/analytics/postHog";
import { ANALYTICS_EVENTS } from "../../util/analytics/analyticsEvents";

/**
 * The first screen a stranger sees — before any account exists.
 *
 * The app used to open on a login wall: give us an account, then we'll tell you
 * what we can do for you. This asks five questions first and lets the signup
 * step unlock the answer instead of guarding it.
 */
const ActOneWelcome: React.FC = () => {
  const { colors } = useTheme();
  const motion = useMotion();
  const navigation = useNavigation<any>();
  // ScreenView applies NO safe-area padding of its own — the copy sat under the
  // Dynamic Island the moment this screen stopped vertically centring its body.
  const insets = useSafeAreaInsets();

  const analyticsOn = useAnalyticsConsentStore((s) => s.enabled);
  const setAnalyticsOn = useAnalyticsConsentStore((s) => s.setEnabled);
  const setStep = useOnboardingDraftStore((s) => s.setStep);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  /** Measured height of the illustration slot — see the onLayout below. */
  const [stageHeight, setStageHeight] = useState(0);

  const handleStart = () => {
    track(ANALYTICS_EVENTS.ONBOARDING_STARTED);
    setStep(1);
    navigation.navigate("ActOneQuestion", { screenNumber: 1, preAuth: true });
  };

  return (
    <ScreenView style={styles.screen}>
      <SchemeStatusBar />

      {/* ILLUSTRATION FIRST, then the words. The character is doing the
          introducing; the copy explains what it showed. Leading with a wall of
          text and putting the picture underneath is the arrangement that made
          this screen feel like a form. */}
      <View style={[styles.body, { paddingTop: insets.top + spacing.lg }]}>
        {/* Staggered so the page assembles rather than snapping into place.
            45ms apart (the DS step) — enough to read as a cascade, short enough
            that nobody waits for it. Seen once per person, which is the only
            reason decoration is justified here at all. */}
        {/* The slot measures itself and hands its height to the illustration,
            which then fills it exactly. See the note on `sizes()` in
            WelcomeStage for why this is measured rather than derived from the
            window: the art's budget is whatever the text block and footer leave
            over, and that is a different fraction of the screen on every
            device. */}
        <Animated.View
          style={styles.stageSlot}
          entering={motion.stagger(0)}
          onLayout={(e) => setStageHeight(e.nativeEvent.layout.height)}
        >
          <WelcomeStage reduced={motion.reduced} available={stageHeight} />
        </Animated.View>

        {/* RECOGNITION BEFORE EFFORT.

            Previous drafts ("Let's find where to start", "Where should we
            start?") were interchangeable with any onboarding screen ever
            shipped — they described OUR process rather than the reader's life,
            and asked for a minute of effort before giving anything back.

            This says something only someone who knows this audience would say.
            Everybody who stutters carries a private ranking of situations; the
            list is the most ordinary thing in the world to them and invisible
            to everyone else. Naming it is the whole trick: it earns the five
            questions instead of just requesting them. The bubbles above are
            three items off somebody else's list, so the art and the line are
            doing one job together.

            It is also the voice the rest of Act 1 already uses — "How heavy
            does it feel right now?", "How often do you stay quiet when you'd
            rather speak?" This screen was the only one that sounded like a
            form.

            SET IN `screenTitle` (38/44 extrabold), the largest thing the type
            scale has — not `display` (32/40 bold). At display size on a single
            centred line it read as a caption under a picture. This has to be
            the loudest thing on the screen after the character.

            THE LINE BREAK IS DELIBERATE. At 38pt the string fits one line with
            about 40pt to spare, and one long line is a weaker shape than a
            stacked two-line block — the reason every reference lockup reads as
            "Chase Your / Dream" rather than a single run. Hard-coding a break
            is normally a smell; on a hero headline of fixed, non-localised copy
            it is a typesetting decision. Anything that changes this string must
            re-check the break. */}
        <View style={styles.copyBlock}>
        <Animated.View entering={motion.stagger(1)}>
          <Text variant="screenTitle">Everyone has{"\n"}a list.</Text>
        </Animated.View>

        <Animated.View entering={motion.stagger(2)}>
          {/* Carries the domain in words. The bubbles say "speaking" visually,
              but they're hidden from assistive tech, so without this line a
              screen-reader user would hear "Everyone has a list" and have no
              idea a list OF WHAT.

              Kept under ~34 characters so it holds ONE line. The longer draft
              ("The moments where speaking gets hard. Tell us yours.") wrapped
              and left "yours." orphaned on a line of its own, which reads as a
              layout accident rather than a sentence. All three tiers are single
              lines now, so the hierarchy — display, body, caption — is legible
              at a glance instead of as a paragraph. */}
          <Text variant="body" color="secondary">
            Tell us where speaking gets hard.
          </Text>
        </Animated.View>

        {/* THE FACTS, DEMOTED. These used to be welded onto the sentence above
            ("Five quick questions about speaking. About a minute, and no
            account needed."), which made the one warm line on the screen read
            like a spec sheet. Separated and dropped to tertiary they become
            scannable reassurance — and they give the empty band above the CTA
            something to do besides be empty. */}
        <Animated.View entering={motion.stagger(3)}>
          <Text variant="caption" color="tertiary">
            5 questions · about a minute · no account needed
          </Text>
        </Animated.View>
        </View>
      </View>

      <View style={styles.footer}>
        <Animated.View entering={motion.stagger(4)}>
          {/* NO rightIcon. A chevron here (as in the reference screens) makes
              the DS Button truncate its own label to "Let's st…" — the Icon
              takes width from a row whose Text is locked to one line. An arrow
              is not worth a broken call to action; the DS bug is filed
              separately. */}
          <Button label="Let's start" onPress={handleStart} />
        </Animated.View>

        {/*
          Without this a returning user who reinstalls is trapped answering five
          questions before they can reach their own account.

          A TEXT LINK, NOT A SECOND BUTTON. Two stacked pills gave the screen two
          things of equal visual weight and no obvious path; this is the
          exception, so it should look like one. It also fixes a real defect —
          as a full-width ghost Button the label rendered "I already have an
          acco…", because the DS Button locks its label to one line at the
          `title` scale. (That truncation is invisible until the custom font
          finishes loading, which is why it survived the first screenshots.)

          Padded rather than hitSlop'd: RN's Text honours `style` reliably and
          `hitSlop` only patchily, and the footnote below already sets this
          pattern. The vertical padding is what carries it to the 44pt minimum.
        */}
        <Animated.View entering={motion.stagger(5)}>
          <Text
            variant="bodySm"
            color="secondary"
            center
            style={styles.signInRow}
            onPress={() => navigation.navigate("Auth")}
          >
            Already have an account?{" "}
            {/* `link`, not the brand fill: the DS guards against bright accent
                hues used as text because they drop below AA on a light
                surface. */}
            <Text variant="bodySm" color="link">
              Log in
            </Text>
          </Text>
        </Animated.View>

        {/*
          The opt-out has to live on THIS screen — the only thing Act 1 sends is
          a step number, but the usual control is in Settings, which nobody can
          reach without an account.

          It is a footnote rather than a toggle card because this is the first
          thing anyone sees: a switch sitting between the headline and the CTA
          makes an invitation read like a preferences page, and asks for a
          decision before the person knows what they are deciding about. The
          line states plainly what is collected; the sheet holds the control for
          anyone who wants it.
        */}
        <Animated.View entering={motion.stagger(6)}>
          <Text
            variant="caption"
            color="tertiary"
            center
            style={styles.noteRow}
            onPress={() => setPrivacyOpen(true)}
          >
          We count which question people stop on — never your answers.{" "}
          {/* `link`, not the brand fill: the DS guards against bright accent
              hues used as text because they drop below AA on a light surface. */}
            <Text variant="caption" color="link">
              Change
            </Text>
          </Text>
        </Animated.View>
      </View>

      <Sheet visible={privacyOpen} onClose={() => setPrivacyOpen(false)}>
        <View style={styles.sheet}>
          <Text variant="h2" color="primary">
            What we count
          </Text>
          <Text variant="body" color="secondary">
            To make this shorter we record which question people stop on —
            nothing else. Your answers stay on this device until you create an
            account, and they are never part of this.
          </Text>

          <View
            style={[
              styles.sheetRow,
              {
                backgroundColor: colors.surface.default,
                borderColor: colors.border.default,
              },
            ]}
          >
            <View style={styles.sheetRowText}>
              <Text variant="bodySm" color="primary">
                Share anonymous usage
              </Text>
            </View>
            <Toggle
              value={analyticsOn}
              onChange={(v) => {
                // Both are required: the store gates our own track() calls, and
                // applyAnalyticsConsent stops PostHog's provider-level capture.
                setAnalyticsOn(v);
                applyAnalyticsConsent(v);
              }}
            />
          </View>

          <Button
            label="Done"
            variant="secondary"
            onPress={() => setPrivacyOpen(false)}
          />
        </View>
      </Sheet>
    </ScreenView>
  );
};

export default ActOneWelcome;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 0,
  },
  body: {
    flex: 1,
    /**
     * CENTRED, and it fixes two things at once.
     *
     * With `flex-start` all the slack piled up at the bottom: a quarter of the
     * screen was dead air above the CTA, while the top bubble was jammed
     * against the Dynamic Island with no clearance at all. Centring splits that
     * slack evenly — the illustration gets room to breathe at the top and the
     * gap above the CTA halves.
     *
     * Safe to centre here ONLY because the illustration is sized off the
     * viewport (`sizes()` in WelcomeStage) and shrinks on a short screen.
     * Centring content that can overflow pushes the overflow out at BOTH ends,
     * and the half above scroll offset 0 becomes unreachable — the trap that
     * clipped OnboardingDone's title on an SE. Nothing here can grow past the
     * viewport, so it cannot bite.
     */
    justifyContent: "flex-start",
    // paddingTop is applied inline from the safe-area inset.
    paddingHorizontal: space.screenX,
    gap: space.groupGap,
    paddingBottom: space.groupGap,
  },
  /**
   * The text block, anchored to the BOTTOM of the body.
   *
   * `stageSlot` is flex:1 above it, so the illustration takes the slack at the
   * top and this lands hard against the CTA. That stacking — art floating up
   * top, a dense text block sitting on the button — is what gives the reference
   * screens their weight. Centring everything as one group (the previous pass)
   * left the copy hovering in the middle with air on both sides, which reads as
   * unfinished rather than composed.
   *
   * LEFT-ALIGNED, and not just for looks: the very next screen — question 1 —
   * is left-aligned. Centring here meant the headline jumped sideways the
   * instant someone tapped Start.
   */
  copyBlock: {
    gap: space.inlineGap,
  },
  // flex:1 so the illustration absorbs ALL the vertical slack and the text
  // block below it is pushed down onto the CTA. (An earlier pass removed the
  // flex to close a gap between art and headline; that gap is gone for a
  // different reason now — the copy is bottom-anchored, so the leftover space
  // lands above the art where it reads as margin rather than as a seam.)
  stageSlot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    paddingHorizontal: space.screenX,
    paddingBottom: spacing["2xl"],
    gap: space.rowGap,
  },
  // paddingVertical carries a ~20pt line to the 44pt minimum tap target.
  signInRow: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  noteRow: {
    paddingTop: space.inlineGap,
    paddingHorizontal: spacing.md,
  },
  sheet: {
    gap: space.groupGap,
  },
  sheetRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.rowGap,
    borderWidth: 1,
    borderRadius: radius.card,
    padding: spacing.lg,
  },
  sheetRowText: {
    flex: 1,
  },
});
