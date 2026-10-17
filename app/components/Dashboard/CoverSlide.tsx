import React from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import { borderWidth, radius as radii, spacing, useTheme } from "../../design-system";
import { COVER_ASPECT, CoverBook, CoverTitle, coverTitle } from "../ProgramCoverArt";
import type { ProgramCover } from "../../util/packs/programCover";

/**
 * ===========================================================================
 * A HOME SLIDE WITH A COVER: THE BOOK AND ITS WORDS, A PLAIN STRIP BELOW
 * ---------------------------------------------------------------------------
 * The skeleton both Home slides share once their program has a cover, for the
 * same reason OfferSlide gives for its skins: two copies of a layout drift.
 * The in-progress slide and the offers pass their own words and buttons; the
 * geometry lives here and only here.
 *
 * The whole cover stands at the left, like a book next to its blurb, and the
 * label, the title and one line of what matters sit beside it on the card's
 * own colour (see ProgramCoverArt for why the art is never cut to fill a wide
 * card). The strip under both holds the progress or the price and the way in.
 *
 * ── THE SAME HEIGHT AS EVERY OTHER SLIDE ───────────────────────────────────
 * The carousel row stretches every slide to the tallest, and the plain slides
 * beside these (the "more programs" tile, the all-done slide) are 260. A cover
 * card that filled its full height with the cover left the title a column
 * about 125 wide. With the strip under it the cover is 172 tall and the
 * title gets 175.
 * ===========================================================================
 */

/**
 * The plain slide's `SLIDE_CARD_HEIGHT`, restated rather than imported:
 * OfferSlide imports this file, and a constant read across that cycle is
 * undefined while the modules load. A test holds the two equal.
 */
export const COVER_SLIDE_HEIGHT = 260;
/** The strip under the cover and its words. */
export const COVER_FOOTER_HEIGHT = 64;
/** Card edge to cover, and cover to words. */
const PAD = spacing.md;
const GAP = spacing.md + 2;
/** The cover fills the height above the strip, less the padding. */
export const COVER_BOOK_H = COVER_SLIDE_HEIGHT - COVER_FOOTER_HEIGHT - PAD * 2;
export const COVER_BOOK_W = Math.round(COVER_BOOK_H * COVER_ASPECT);
/**
 * Card top to the bottom of the action, for the shelf's visibility maths. The
 * action is about 32 tall and centred in the strip, which leaves 16 under it.
 */
export const COVER_CTA_BOTTOM_FROM_CARD_TOP = COVER_SLIDE_HEIGHT - spacing.lg;

export interface CoverSlideProps {
  cover: ProgramCover;
  /** Above the title: a status chip, or the shelf line and a claim. */
  label: React.ReactNode;
  title: string;
  /** Under the title, at the foot of the column: what is next, or why. */
  note?: React.ReactNode;
  /** The strip's left side. */
  detail: React.ReactNode;
  /** The strip's right side. */
  action: React.ReactNode;
  radius: number;
  border?: string;
  elevate?: ViewStyle;
}

const CoverSlide: React.FC<CoverSlideProps> = ({
  cover,
  label,
  title,
  note,
  detail,
  action,
  radius,
  border,
  elevate,
}) => {
  const { colors } = useTheme();
  return (
    // Two boxes: the outer one casts the shadow, the inner one clips to the
    // corners. One box doing both would clip its own shadow away on iOS.
    <View
      style={[
        styles.card,
        {
          borderRadius: radius,
          backgroundColor: colors.background.raised,
          borderColor: border,
          borderWidth: border ? borderWidth.hairline : 0,
        },
        elevate,
      ]}
    >
      <View style={[styles.clip, { borderRadius: radius }]}>
        <View style={styles.top}>
          <CoverBook cover={cover} width={COVER_BOOK_W} radius={radii.md} />
          <View style={styles.words}>
            {label}
            <CoverTitle
              title={title}
              cut={coverTitle.card}
              numberOfLines={3}
              style={styles.title}
            />
            <View style={styles.spacer} />
            {note}
          </View>
        </View>

        <View style={[styles.footer, { borderTopColor: colors.border.hairline }]}>
          <View style={styles.detail}>{detail}</View>
          {action}
        </View>
      </View>
    </View>
  );
};

export default CoverSlide;

const styles = StyleSheet.create({
  // `flex: 1` over the minimum, as on the plain slides: the carousel row
  // stretches every slide to the tallest one beside it.
  card: {
    flex: 1,
    minHeight: COVER_SLIDE_HEIGHT,
  },
  clip: {
    flex: 1,
    overflow: "hidden",
  },
  top: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    padding: PAD,
    gap: GAP,
  },
  words: {
    flex: 1,
    minWidth: 0,
    alignSelf: "stretch",
    overflow: "hidden",
  },
  title: { marginTop: spacing.sm },
  spacer: { flex: 1, minHeight: spacing.sm },
  footer: {
    height: COVER_FOOTER_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingLeft: spacing.lg,
    paddingRight: spacing.md,
    borderTopWidth: borderWidth.hairline,
  },
  // Yields to the action, which never truncates.
  detail: { flex: 1, minWidth: 0 },
});
