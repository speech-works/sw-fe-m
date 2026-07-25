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
          <WelcomeStage available={stageHeight} />
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

          {/* THE FACTS, DEMOTED. These used to be welded onto the sentence above,
            which made the one warm line on the screen read like a spec sheet.
            Separated and dropped to tertiary they become scannable reassurance.

            "no account needed" was a third fact here and is gone. It was the
            weakest of the three — the flow demonstrates it a second later by
            simply not asking for an account — and two facts scan in one glance
            where three read as a list. */}
          <Animated.View entering={motion.stagger(3)}>
            <Text variant="caption" color="tertiary">
              5 questions · about a minute
            </Text>
          </Animated.View>
        </View>
      </View>

      {/* The bottom inset is applied here for the same reason the top one is
          applied above: ScreenView supplies neither, so without it the privacy
          note clears the home indicator only by luck of the padding value.
          `max` keeps it honest on a device that has no indicator at all. */}
      <View
        style={[
          styles.footer,
          { paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.md },
        ]}
      >
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
          decision before the person knows what they are deciding about.

          WHY, NOT WHAT. This used to say "We count where people stop, never
          answers." Two things were wrong with it. It led with what we take, so
          the reader's first thought was that something was being taken. And the
          denial backfired — "never answers" plants the idea that answers COULD
          be taken, which nobody was worried about until we raised it. A
          reassurance phrased as a negation reliably creates the doubt it means
          to settle.

          So the line now gives the purpose and stops. "Anonymous" carries the
          reassurance without a denial attached, and the sheet holds the detail
          for anyone who actually wants to decide.
        */}
        <Animated.View entering={motion.stagger(6)}>
          <Text
            variant="caption"
            color="tertiary"
            center
            style={styles.noteRow}
            onPress={() => setPrivacyOpen(true)}
          >
            Anonymous usage helps us keep this short.{" "}
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
          {/*
            The heading was "What we count", which framed the whole sheet as a
            disclosure of what we take. "Keeping this short" is the actual
            reason any of it exists, and it is a reason that serves the reader.

            HOW FAR TO SOFTEN. The footnote outside can be purpose-only, because
            it is a pointer. This sheet cannot: the toggle below it IS the
            consent, so whoever opens this has to come away able to decide. That
            is why one plain example survives. Vagueness is not automatically
            kinder here — "we collect usage data" is what every app says and
            nobody believes, whereas a detail this mundane is reassuring
            precisely because it is so obviously harmless.

            What DID go are the two denials — "nothing else" and "never part of
            this". Both raised doubts nobody had. The device line says the same
            thing as a plain positive fact instead.
          */}
          <Text variant="h2" color="primary">
            Keeping this short
          </Text>
          <Text variant="body" color="secondary">
            Fewer questions is better for everyone, so we look at anonymous
            usage — how far people get before they stop — to see what we can
            cut.
          </Text>
          <Text variant="body" color="secondary">
            Your answers stay on this device until you make an account.
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
  /**
   * The footer holds three things of very different importance, and an even
   * gap between all three made them read as one dense block of text — the
   * "overwhelming" bottom.
   *
   * So the gap is removed and spacing is carried by the rows themselves: a
   * generous break after the CTA, then the two secondary lines tucked close
   * together so they group as one quiet footnote rather than as two more
   * things to read. Proximity does the grouping; nothing had to be deleted for
   * the stack to calm down.
   */
  footer: {
    paddingHorizontal: space.screenX,
    // paddingBottom is applied inline from the safe-area inset.
  },
  // Asymmetric on purpose: the big padding above separates this from the CTA,
  // the small padding below binds it to the note underneath. Together they
  // still carry a ~20pt line past the 44pt minimum tap target.
  signInRow: {
    paddingTop: spacing["2xl"],
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  noteRow: {
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
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
