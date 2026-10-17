import React, { useCallback, useState } from "react";
import {
  Image,
  StyleSheet,
  View,
  type DimensionValue,
  type LayoutChangeEvent,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import {
  Gradient,
  Text,
  borderWidth,
  castShadow,
  fonts,
  palette,
  spacing,
  space,
  useTheme,
  withAlpha,
} from "../design-system";
import type { ProgramCover } from "../util/packs/programCover";

/**
 * ===========================================================================
 * A PROGRAM'S COVER, SHOWN WHOLE, WITH ITS WORDS BESIDE IT
 * ---------------------------------------------------------------------------
 * One set of pieces for the four places a cover appears: the Home shelf, the
 * shop, the sales page and an owned program.
 *
 * ── THE PICTURE IS NEVER CUT OR COVERED ────────────────────────────────────
 * Every cover is drawn 3:4, and every box it goes in is 3:4: the cover sets
 * its own size from a width. A wide card puts the cover at its side, like a
 * book standing next to its blurb, rather than stretching, cropping or
 * blurring the art to fill the card. Two earlier passes are worth recording so
 * neither comes back: a top crop cut the art, and fitting it into a wide box
 * with a blurred copy either side read as cropped too.
 *
 * ── THE WORDS ARE ON THE PAGE'S OWN COLOURS ────────────────────────────────
 * The eyebrow, the title and everything else sit next to or under the cover,
 * on the card or the page, so they read on both schemes and over every cover
 * the same way. No type is set on the art.
 * ===========================================================================
 */

/** Width over height of every cover. */
export const COVER_ASPECT = 3 / 4;

/** The dark the shadows are cast in. */
const ART_SHADE = palette.ink.sunken;

/** The title cuts, one per surface, all Inter ExtraBold. */
export const coverTitle = StyleSheet.create({
  /** Under the standalone cover on the sales and owned pages. */
  page: { fontFamily: fonts.extrabold, fontSize: 30, lineHeight: 34, letterSpacing: -0.8 },
  /** Beside the cover on the shop's top match. */
  hero: { fontFamily: fonts.extrabold, fontSize: 24, lineHeight: 27, letterSpacing: -0.6 },
  /** Beside the cover on a Home card. */
  card: { fontFamily: fonts.extrabold, fontSize: 22, lineHeight: 25, letterSpacing: -0.5 },
  /** Under a cover in a shop row. */
  tile: { fontFamily: fonts.extrabold, fontSize: 15, lineHeight: 19, letterSpacing: -0.2 },
}) satisfies Record<string, TextStyle>;

/**
 * The cut, shrunk only as far as the title's longest word needs to fit `width`.
 *
 * Sized here rather than with `adjustsFontSizeToFit`: iOS shrinks the glyphs
 * but keeps the line height and the full-size layout, so a three-line title
 * spread apart like a list. Words never break, so the longest one sets the
 * size, and the line height shrinks with it. 0.64em is a generous average for
 * Inter ExtraBold.
 */
export function fitCoverTitle(
  title: string,
  width: number,
  cut: TextStyle,
): TextStyle {
  const size = cut.fontSize ?? 20;
  const longest = Math.max(1, ...title.split(/\s+/).map((w) => w.length));
  const fitted = Math.min(size, Math.floor(width / (longest * 0.64)));
  if (fitted >= size) return cut;
  const ratio = fitted / size;
  return {
    ...cut,
    fontSize: fitted,
    lineHeight: Math.round((cut.lineHeight ?? size) * ratio),
    letterSpacing: (cut.letterSpacing ?? 0) * ratio,
  };
}

/**
 * A program title in one of the cuts above, fitted to the width it is given.
 *
 * The width is measured, not passed: the same title sits in a Home card, a
 * shop column and a page, and each of those is as wide as the phone makes it.
 * Hidden for the one frame before the measure lands, so a long word is never
 * seen breaking mid-word at the full size.
 */
export const CoverTitle: React.FC<{
  title: string;
  cut: TextStyle;
  numberOfLines?: number;
  center?: boolean;
  style?: StyleProp<TextStyle>;
  header?: boolean;
}> = ({ title, cut, numberOfLines = 3, center, style, header }) => {
  const [width, setWidth] = useState(0);
  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    setWidth((prev) => (Math.abs(prev - w) < 1 ? prev : w));
  }, []);
  return (
    <View onLayout={onLayout} style={styles.titleBox}>
      <Text
        variant="h2"
        color="primary"
        center={center}
        numberOfLines={numberOfLines}
        accessibilityRole={header ? "header" : undefined}
        style={[width ? fitCoverTitle(title, width, cut) : [cut, styles.unmeasured], style]}
      >
        {title}
      </Text>
    </View>
  );
};

export interface CoverBookProps {
  cover: ProgramCover;
  /** The height follows from the art's 3:4. */
  width: number;
  /** A book's corner: tighter than the card around it. */
  radius: number;
  /** `soft` inside a card, `lifted` for the standalone cover on a page. */
  shadow?: "soft" | "lifted";
  /**
   * Announce what the picture shows. Only where the cover stands on its own.
   * Inside a button the button's label already names the program, and a scene
   * description read on every card of a shelf is noise.
   */
  describe?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * The whole cover at a given width, as one object with a hairline edge and a
 * shadow. Two boxes, as on the Home cards: the outer one casts the shadow, the
 * image clips itself to the corners. One box doing both would clip its own
 * shadow away on iOS.
 */
export const CoverBook: React.FC<CoverBookProps> = ({
  cover,
  width,
  radius,
  shadow = "soft",
  describe,
  style,
}) => {
  const { colors } = useTheme();
  const height = width / COVER_ASPECT;
  const label = describe ? cover.description : null;
  return (
    <View
      style={[
        { width, height, borderRadius: radius },
        shadow === "lifted"
          ? castShadow(ART_SHADE, { y: 24, blur: 60, alpha: 0.55, elevation: 12 })
          : castShadow(ART_SHADE, { y: 6, blur: 16, alpha: 0.35, elevation: 4 }),
        style,
      ]}
      accessible={!!label}
      accessibilityRole={label ? "image" : undefined}
      accessibilityLabel={label ?? undefined}
      importantForAccessibility={label ? "yes" : "no-hide-descendants"}
      accessibilityElementsHidden={!label}
    >
      <Image
        source={cover.source}
        resizeMode="cover"
        style={[
          styles.bookArt,
          {
            borderRadius: radius,
            borderColor: withAlpha(colors.text.primary, 0.08),
          },
        ]}
      />
    </View>
  );
};

/**
 * The same art, blurred and dimmed, behind a standalone cover: the sales page
 * and an owned program. It fades into the page canvas so the copy below the
 * cover sits on the page, not on the picture.
 *
 * Dimmed on ink, lifted on paper. The point is a quiet ground for the cover to
 * stand on, and on paper a darkened band would put the pitch's dark ink on a
 * dark ground.
 */
export const CoverBackdrop: React.FC<{
  cover: ProgramCover;
  height: DimensionValue;
  style?: StyleProp<ViewStyle>;
}> = ({ cover, height, style }) => {
  const { colors, scheme } = useTheme();
  const canvas = colors.background.canvas;
  return (
    <View
      style={[styles.backdrop, { height }, style]}
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
    >
      <Image source={cover.source} resizeMode="cover" blurRadius={48} style={styles.backdropArt} />
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor:
              scheme === "dark" ? withAlpha(ART_SHADE, 0.4) : withAlpha(canvas, 0.45),
          },
        ]}
      />
      <Gradient
        colors={[withAlpha(canvas, 0.15), withAlpha(canvas, 0.4), canvas]}
        locations={[0, 0.45, 0.92]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
};

/** The width of the standalone cover; its height follows the art's 3:4. */
export const STANDALONE_COVER_W = 220;

/** A book's corner on the sales and owned pages. */
export const COVER_RADIUS = 20;

/**
 * The sales page and an owned program open the same way: the whole cover,
 * centred on its blurred backdrop, then the length and the title under it on
 * the page.
 *
 * `width` is narrower on the sales page, which has to fit the cover, the
 * words, the numbers and the price bar on one screen without scrolling.
 */
export const StandaloneCover: React.FC<{
  cover: ProgramCover;
  eyebrow?: string | null;
  title: string;
  width?: number;
}> = ({ cover, eyebrow, title, width = STANDALONE_COVER_W }) => {
  const { colors } = useTheme();
  return (
    <View style={styles.standalone}>
      <CoverBook
        cover={cover}
        width={width}
        radius={COVER_RADIUS}
        shadow="lifted"
        describe
      />
      {eyebrow ? (
        <Text
          variant="eyebrow"
          color={colors.text.accent}
          center
          numberOfLines={1}
          style={styles.standaloneEyebrow}
        >
          {eyebrow}
        </Text>
      ) : null}
      <CoverTitle
        title={title}
        cut={coverTitle.page}
        center
        header
        style={eyebrow ? styles.standaloneTitleTight : styles.standaloneTitle}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  // Stretches to its column, so the measure is the room the title has.
  titleBox: { alignSelf: "stretch" },
  unmeasured: { opacity: 0 },
  bookArt: {
    width: "100%",
    height: "100%",
    borderWidth: borderWidth.hairline,
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    overflow: "hidden",
  },
  // Past every edge, so the blur has picture to sample there rather than the
  // transparent ring a blurred image grows at its own border.
  backdropArt: {
    position: "absolute",
    top: -60,
    left: -60,
    right: -60,
    bottom: -60,
  },
  standalone: { alignItems: "center", alignSelf: "stretch" },
  standaloneEyebrow: { marginTop: space.groupGap + spacing.xs },
  standaloneTitle: { marginTop: space.groupGap + spacing.xs },
  standaloneTitleTight: { marginTop: spacing.xs },
});
