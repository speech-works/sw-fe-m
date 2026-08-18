import React from "react";
import { StyleSheet, View } from "react-native";
import { Text, useTheme, fonts } from "../../../../../design-system";
import type { NextCardPreview } from "../../../../../api/homeCards";
import { resolveAccent } from "./accent";

/**
 * ============================================================================
 * THE PAGES IN THE FOLDER
 * ----------------------------------------------------------------------------
 * Up to two cards, drawn as wide pages sitting IN the folder's pocket with only
 * their tops out. The front page carries the next card's copy; the one behind it
 * is a colour and nothing else.
 *
 * ── THE RATIO IS THE WHOLE LOOK ─────────────────────────────────────────────
 * A page is 53 tall and starts 7 points down, so about 41 points of it clear the
 * front face and about 12 sit behind it. Too little inside and the page floats
 * on top of the card instead of being held by it; too much and it is a stripe.
 * The front face MUST be drawn after these, or the bottoms hang over it and the
 * whole illusion inverts.
 *
 * ── WHY THE PAGES START 7 POINTS DOWN AND NOT AT THE TOP ────────────────────
 * At zero they cover the tab completely, and the object stops reading as a
 * folder: it becomes a bright card lying on a dark one. Seven points of tab
 * above the page is the least that still says folder.
 *
 * ── WHY EACH PAGE HAS A LIGHT FRAME ─────────────────────────────────────────
 * A bare fill sinks into the warm panel on paper and into the ink on dark. The
 * frame is what makes the page read as a separate object on BOTH grounds, and it
 * is the single thing that separates this from a coloured rectangle.
 *
 * ── THE COLOUR COMES FROM THE CONSOLE, NOT FROM THE CARD TYPE ───────────────
 * This used to map `cardType` to a fixed hue, which meant every TEACH card was
 * blue forever and the founder could not distinguish two of them. Each card now
 * carries its own `accent` key. `cardType` stays on the payload as metadata but
 * no longer decides anything visual.
 * ============================================================================
 */

/**
 * How tall the pages' own layer is.
 *
 * Deeper than the tallest page (7 + 53 = 60) so nothing is clipped by the band
 * itself. The front face is what hides the bottoms, not an overflow rule.
 */
export const PAGES_BAND = 64;

export const Pages: React.FC<{ queued: NextCardPreview[] }> = ({ queued }) => {
  const { colors, elevation } = useTheme();

  const front = queued[0];
  const behind = queued[1];
  if (!front) return null;

  // The white frame. `surface.inverse` is the one token that is WHITE in both
  // schemes, which is exactly what a paper frame has to be.
  const matte = colors.surface.inverse;

  const f = resolveAccent(front.accent, colors);
  const b = behind ? resolveAccent(behind.accent, colors) : null;

  return (
    <View
      pointerEvents="none"
      // Decorative on top of information that is already reachable: these
      // announce that something else is queued, and the card itself says what.
      // Reading both aloud would make the card's own label ambiguous.
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={styles.band}
    >
      {b ? (
        <View style={[styles.matte, styles.behind, { backgroundColor: matte }, elevation.e2]}>
          <View style={[styles.inner, { backgroundColor: b.fill }, b.edge]} />
        </View>
      ) : null}

      <View style={[styles.matte, styles.front, { backgroundColor: matte }, elevation.e2]}>
        <View
          style={[
            styles.inner,
            styles.frontInner,
            { backgroundColor: f.fill },
            f.edge,
          ]}
        >
          {/* `maxFontSizeMultiplier` is 1 on BOTH lines. The page is a fixed 53
              points tall with 41 of them visible; scaled type does not reflow
              here, it disappears behind the front face. The full-size copy of
              this same text arrives on the card itself once this page reaches
              the front of the queue. */}
          <Text
            color={f.ink}
            numberOfLines={1}
            maxFontSizeMultiplier={1}
            style={styles.label}
          >
            {front.label}
          </Text>
          <Text
            color={f.ink}
            numberOfLines={1}
            maxFontSizeMultiplier={1}
            style={styles.line1}
          >
            {front.line1}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  band: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: PAGES_BAND,
  },
  matte: {
    position: "absolute",
    borderRadius: 10,
    // The frame's thickness. 2.5 reads as a mount at this size; at 2 it is a
    // hairline and at 3 it starts to look like a border rather than paper.
    padding: 2.5,
  },
  inner: {
    flex: 1,
    borderRadius: 8,
    overflow: "hidden",
  },
  frontInner: {
    paddingTop: 5,
    paddingHorizontal: 7,
  },
  /**
   * The page behind, offset LEFT and UP and turned 3 degrees. Small numbers on
   * purpose: enough to say "more than one", not enough to look scattered.
   */
  behind: {
    left: 8,
    right: 24,
    top: 11,
    height: 49,
    transform: [{ rotate: "-3deg" }],
  },
  front: {
    left: 20,
    right: 8,
    top: 7,
    height: 53,
  },
  label: {
    fontFamily: fonts.extrabold,
    fontSize: 8,
    lineHeight: 10,
    letterSpacing: 0.7,
    // The eyebrow rides at a fraction of the hero's ink rather than taking a
    // second tuned colour. Two foregrounds on one page is a hierarchy nobody
    // can see, and `accentOn` has no muted cut to borrow.
    opacity: 0.72,
  },
  line1: {
    fontFamily: fonts.extrabold,
    fontSize: 11,
    lineHeight: 13,
    letterSpacing: -0.2,
    marginTop: 1,
  },
});
