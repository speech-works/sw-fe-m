import React from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import Svg, { Path } from "react-native-svg";
import { UserAvatar } from "../../components/UserAvatar";
import {
  Text,
  radius,
  spacing,
  useTheme,
  withAlpha,
} from "../../design-system";
import { SITUATION_PHRASE } from "../../constants/onboardingActOne";

/**
 * The welcome illustration: a character on a colored stage, with the things
 * people find hard drifting out of them as speech bubbles.
 *
 * WHY BUBBLES AND NOT DECORATION. The bubbles are the one ornament here that
 * also does a job: they are literal answer options from question 1
 * (`SITUATION_PHRASE`), so before anyone taps Start they can already see what
 * kind of thing we are going to ask about. That is the difference between a
 * screen that looks friendly and a screen that IS friendly — a stranger learns
 * what they are agreeing to from the picture.
 *
 * They replaced a ring of ambient "speech ripples" that said only "this
 * character is speaking". The bubbles say what they are speaking ABOUT, which
 * is the part a stranger actually needs. Ornament that carries information
 * survives review; ornament that doesn't is the first thing to cut.
 *
 * Everything here is decorative-by-a11y: the copy under the illustration says
 * all of it in words, so the whole stage is hidden from assistive tech rather
 * than read out as a pile of disconnected phrases.
 */

/**
 * The illustration is sized from the SPACE IT ACTUALLY HAS, not the viewport.
 *
 * Two earlier attempts, and why each failed:
 *
 *  - A fixed 296 left a dead band between the art and the headline. The slot
 *    grew with the screen, the art didn't, and flex handed the whole difference
 *    to empty space.
 *  - A viewport fraction (`height × 0.32`) was closer but still a guess. The
 *    art's real budget is "whatever the text block and footer leave over", and
 *    that is a different fraction of the screen on every device. Tuned large
 *    enough to fill a 16 Pro it overflowed an SE; tuned safe for an SE it left
 *    ~100pt of air under the character on a 16 Pro.
 *
 * So the slot measures itself and passes its height in. The art fills the gap
 * exactly on any device, and there is no magic fraction to re-tune whenever the
 * copy underneath changes length.
 *
 * `available` is 0 on the first render, before layout has run — hence the
 * floor, which stops the character flashing at zero size for a frame.
 */
const MIN_BLOB = 150;

const sizes = (width: number, available: number) => {
  // ÷1.14 inverts `stageHeight = blob × 1.14`, so it is the STAGE that matches
  // the slot rather than the blob.
  const blob = Math.max(MIN_BLOB, Math.min(width * 0.82, available / 1.14));
  return {
    blob,
    // 0.62 keeps the character comfortably inside the blob's narrowest lobe —
    // the shape is irregular, so this is set against its TIGHTEST radius, not
    // its widest.
    avatar: blob * 0.62,
    stageHeight: blob * 1.14,
  };
};

/**
 * Blob wash, per scheme — and the two are NOT the same number.
 *
 * An identical alpha behaves completely differently over the two canvases. Over
 * warm paper, 0.14 orange is a soft peach that reads as light. Over near-black
 * the same value turns into an opaque muddy brown that reads as a stain on the
 * screen, because the canvas contributes almost nothing to the blend. Dark mode
 * therefore gets roughly half.
 *
 * The DS `action.primaryTint` token can't do this job: it is 0.12 in BOTH
 * schemes, so it lands on the wrong side of exactly this problem.
 */
const BLOB_ALPHA = { dark: 0.075, light: 0.14 } as const;

/**
 * The vertical band the character's head occupies, as a fraction of stage
 * height: the visible tile is 0.75 x the avatar, the avatar is 0.62 x the blob,
 * and the stage is 1.14 x the blob, so the head spans the middle ~41%.
 *
 * Every bubble is placed clear of it. That was optional while the labels were
 * three hand-picked short phrases, and became mandatory the moment the TEASER
 * started echoing whatever the reader actually chose: "speaking in front of
 * people" is 27 characters and drew itself straight across the mouth. Anchors
 * cannot be tuned against a sample string when the real string is user data.
 */
const FACE_BAND = { top: 0.296, bottom: 0.704 };

/** A bubble's own height as a fraction of stage height (~46pt of ~330). */
const BUBBLE_H = 0.14;

/** The only three places a bubble may sit — all derived from FACE_BAND, so
 *  redrawing the character moves the bubbles instead of stranding them. */
const SLOT = {
  top: 0,
  upper: FACE_BAND.top - BUBBLE_H,
  lower: FACE_BAND.bottom + 0.05,
};

/**
 * The three situations shown. Deliberately the SHORTEST phrases in the bank —
 * long ones wrap and the bubbles stop reading as bubbles. Keyed off
 * SITUATION_PHRASE rather than retyped so that rewording a question option can
 * never leave this screen advertising an answer we no longer offer.
 */
const BUBBLES = [
  {
    key: "phone_calls",
    // Each gets its own hue: three chips in one color reads as a tag list, and
    // the whole point is that these are unrelated corners of a life.
    tone: "primary" as const,
    // Anchored to whichever edge each sits nearest, so a longer phrase grows
    // INWARD and can never push a bubble off the screen. The three sit at
    // roughly 10 / 4 / 7 o'clock — spread around the character rather than
    // stacked down one side.
    //
    // `topPct` is a fraction of stage height so the ring of bubbles scales with
    // the art instead of drifting across the face on a bigger screen.
    anchor: { topPct: SLOT.top, left: 0 },
  },
  {
    key: "meeting_people",
    tone: "purple" as const,
    // Tucked just above the head rather than beside it — see FACE_BAND.
    anchor: { topPct: SLOT.upper, right: 0 },
  },
  {
    key: "ordering_food",
    tone: "lime" as const,
    anchor: { topPct: SLOT.lower, left: 12 },
  },
];

/**
 * Organic, hand-drawn-feeling backdrop — the "color field" the character stands
 * on. A circle would read as a logo lockup or an avatar frame; an irregular
 * shape reads as illustration, which is the whole difference in feel.
 *
 * Each quadrant bulges by a different amount on purpose. The first version of
 * this path was near-circular and, tilted or not, still just looked like a
 * circle — asymmetry is the entire effect, so it has to be big enough to see.
 */
const BLOB_PATH =
  "M104 4 C146 2 184 30 190 70 C196 110 168 132 164 162 " +
  "C160 192 122 198 86 192 C50 186 18 166 8 132 " +
  "C-2 98 14 62 40 38 C66 14 62 6 104 4 Z";

/**
 * A situation chip.
 *
 * STATIC, deliberately. These used to drift up and down on staggered periods.
 * Three chips bobbing plus a gaze that tracked between them plus the avatar's
 * idle float plus the entrance stagger was four separate motion systems on a
 * screen whose whole job is one tap — and continuously moving things are
 * permanent attention magnets, competing with the very CTA they sit above.
 *
 * The scene keeps exactly ONE ambient motion now: the character's slow breath.
 * One living thing in a still frame reads as alive; four read as busy.
 */
const Bubble: React.FC<{
  label: string;
  bg: string;
  fg: string;
  place: object;
}> = ({ label, bg, fg, place }) => (
  <View style={[styles.bubble, place, { backgroundColor: bg }]}>
    <Text variant="caption" color={fg}>
      {label}
    </Text>
  </View>
);

const WelcomeStage: React.FC<{
  available: number;
  /**
   * What the bubbles say. THREE STATES, and the difference matters:
   *
   *   undefined — the three sample situations. The welcome screen, where the
   *               bubbles are examples off somebody else's list.
   *   [...]     — the reader's own answers, echoed back. The teaser.
   *   []        — no bubbles at all. Someone who picked "None of these" has
   *               given us nothing to echo, and falling back to the samples
   *               there would show them a list they explicitly did not choose.
   */
  labels?: string[];
}> = ({ available, labels }) => {
  const { colors, scheme } = useTheme();
  const { width } = useWindowDimensions();
  const s = sizes(width, available);

  // Anchors and hues stay put; only the words change. The teaser is meant to
  // read as the same picture the welcome screen showed, now filled in with the
  // reader's own answers — so the composition must not move between them.
  const shown = (labels ?? BUBBLES.map((b) => SITUATION_PHRASE[b.key]))
    .slice(0, BUBBLES.length)
    .map((label, i) => ({ b: BUBBLES[i], label }));

  const tone = {
    primary: { bg: colors.action.primary, fg: colors.action.onPrimary },
    purple: { bg: colors.accent.purple, fg: colors.accentOn.purple },
    lime: { bg: colors.accent.lime, fg: colors.accentOn.lime },
  };

  return (
    <View
      style={[styles.stage, { height: s.stageHeight }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {/* Rotated a few degrees so the shape can't be mistaken for a deliberate
          symmetrical container — the tilt is what makes it read as drawn.

          There used to be concentric "speech ripple" rings on top of this. Blob
          plus rings read as a dartboard: two nested circular systems competing
          for the same centre. The bubbles say "this character is talking" far
          more plainly than rings ever did, so the rings went. */}
      <Svg
        width={s.blob}
        height={s.blob}
        viewBox="0 0 200 200"
        style={styles.blob}
        pointerEvents="none"
      >
        <Path d={BLOB_PATH} fill={withAlpha(
            colors.action.primary,
            scheme === "dark" ? BLOB_ALPHA.dark : BLOB_ALPHA.light,
          )} />
      </Svg>

      {/* No manifest: `UserAvatar` normalises undefined to the default avatar,
          which is right here — there is no account yet, so this is the app's
          face, not "yours". Dressing it in earned gear would show a stranger a
          wardrobe they don't have and spend the celebration screen's one trick
          sixty seconds early. */}
      <UserAvatar size={s.avatar} animate />

      {shown.map(({ b, label }) => (
        <Bubble
          key={b.key}
          label={label}
          bg={tone[b.tone].bg}
          fg={tone[b.tone].fg}
          place={{
            top: b.anchor.topPct * s.stageHeight,
            left: b.anchor.left,
            right: b.anchor.right,
          }}
        />
      ))}
    </View>
  );
};

export default WelcomeStage;

const styles = StyleSheet.create({
  stage: {
    // Full content width so the ~140pt bubbles have room to sit BESIDE the
    // character rather than on top of it; height comes from `sizes()`.
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "center",
  },
  blob: {
    position: "absolute",
    transform: [{ rotate: "-12deg" }],
  },
  bubble: {
    position: "absolute",
    // Long phrases wrap to a second line instead of running the full width of
    // the stage. Combined with FACE_BAND placement, no label can cover the
    // character however long it is.
    maxWidth: "78%",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
});
