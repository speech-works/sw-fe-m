import React from "react";
import { StyleSheet, View } from "react-native";
import Svg, { G, Path, Rect } from "react-native-svg";
import { Text, useTheme, mix } from "../../../../../design-system";
import type { NextCardPreview } from "../../../../../api/homeCards";
import { resolveAccent } from "./accent";
import {
  T,
  MIN_FOLDABLE_WIDTH,
  sheetPath,
  fillPath,
  flapPath,
  flapShadowPath,
  flapFillPath,
} from "./foldedPage";

/**
 * ============================================================================
 * THE PAGES IN THE FOLDER
 * ----------------------------------------------------------------------------
 * Up to two cards, drawn as wide pages sitting IN the folder's pocket with only
 * their tops out. The front one has its corner turned down; the one behind it is
 * a colour and nothing else.
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
 *
 * ── WHY BOTH PAGES LIVE IN ONE SVG ──────────────────────────────────────────
 * They used to be two `View`s, each with the `e2` shadow. The folded corner has
 * to be a real hole (see `foldedPage.ts`), which makes the front page a path,
 * and mixing the two costs more than it looks like it should:
 *
 *   • Android's `elevation` is a Z ORDER as well as a shadow. Leave it on the
 *     back page and take it off the front one and the back page draws ON TOP,
 *     on Android only, whatever the render order says.
 *   • Leave it on the front page and Android traces the shadow from the view's
 *     OUTLINE, which is still a full rectangle. A square shadow corner appears
 *     exactly where the fold says the paper is gone. That is the sticker tell
 *     the fold exists to remove, reintroduced on one platform.
 *
 * So neither page carries a native shadow now. Separation comes from the white
 * mount and a hairline on it, which is the same thing the folder's own back
 * panel already does, and it behaves identically on both platforms.
 *
 * ── THE ONE WORD THE PEEK DOES CARRY ────────────────────────────────────────
 * "Up next", and it is the app's word rather than the card's. It sits 7pt in
 * from the page's left edge, which is exactly where the front card's own eyebrow
 * sits from the card's left edge, so the two stack into one column and the peek
 * reads as the same kind of object one step further back. Moved anywhere else it
 * becomes a badge stuck onto a coloured shape.
 *
 * It costs the author nothing. The copy budget for a card is about eight
 * characters of label and thirteen of hero; this string is fixed in the app and
 * spends none of it.
 *
 * ── WHY THE PEEK NO LONGER CARRIES THE NEXT CARD'S WORDS ────────────────────
 * It used to print the queued card's label and headline at 8 and 11 point. Two
 * problems. Readable copy on the peek competes with the card that actually
 * opens, so people read the wrong thing and tap expecting it. And the fold now
 * sits in the top-right corner, which is where that copy ran. The colour says
 * "another one is queued" and the fold says "there is more behind this"; the
 * words are not needed for either, and the full-size copy arrives on the card
 * itself once this page reaches the front of the queue.
 * ============================================================================
 */

/**
 * How tall the pages' own layer is.
 *
 * Deeper than the tallest page (7 + 53 = 60) so nothing is clipped by the band
 * itself. The front face is what hides the bottoms, not an overflow rule.
 */
export const PAGES_BAND = 64;

/** The page's own corner radius, and the fill's true parallel offset of it. */
const R = 10;
const RI = R - T;

/** The front page: 20 in from the left, 8 from the right, 7 down, 53 tall. */
const FRONT = { x: 20, y: 7, h: 53, inset: 28 };

/**
 * The page behind, offset LEFT and UP and turned 3 degrees. Small numbers on
 * purpose: enough to say "more than one", not enough to look scattered.
 */
const BEHIND = { x: 8, y: 11, h: 49, inset: 32, rotate: -3 };

/**
 * How far the flap's reverse is lifted toward the mount.
 *
 * Paper is lighter on the back than on the printed face, and that reversal is
 * most of what makes a fold read as a fold rather than as a triangle laid on
 * top. 0.6 is the ratio the approved mockup used.
 */
const REVERSE_MIX = 0.6;

/**
 * Where "Up next" sits inside the front page, in points.
 *
 * `x` matches the front card's own body padding, so the two labels share a left
 * edge. `y` clears the fold, which occupies the top-right 14pt and nothing on
 * this side.
 */
const UP_NEXT = { x: 7, y: 6, size: 9.5, opacity: 0.62 };

/** `"transparent"` is a legal SVG stroke but a pointless one. Drop it instead. */
const stroke = (color: string): string | undefined =>
  color === "transparent" ? undefined : color;

export const Pages: React.FC<{ queued: NextCardPreview[]; width: number }> = ({
  queued,
  width,
}) => {
  const { colors } = useTheme();

  const front = queued[0];
  const behind = queued[1];
  if (!front || width <= 0) return null;

  // The white frame. `surface.inverse` is the one token that is WHITE in both
  // schemes, which is exactly what a paper frame has to be.
  const matte = colors.surface.inverse;
  const hair = StyleSheet.hairlineWidth;
  const mountEdge = colors.border.default;

  const f = resolveAccent(front.accent, colors);
  const b = behind ? resolveAccent(behind.accent, colors) : null;

  const fw = width - FRONT.inset;
  const bw = width - BEHIND.inset;

  // Below this the chamfer and the two corner radii would overlap and the path
  // would invert. No shipping phone gets near it; the fallback is a plain page.
  const folded = fw >= MIN_FOLDABLE_WIDTH;

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
      <Svg width={width} height={PAGES_BAND}>
        {b ? (
          <G
            x={BEHIND.x}
            y={BEHIND.y}
            rotation={BEHIND.rotate}
            originX={bw / 2}
            originY={BEHIND.h / 2}
          >
            <Rect
              width={bw}
              height={BEHIND.h}
              rx={R}
              fill={matte}
              stroke={mountEdge}
              strokeWidth={hair}
            />
            <Rect
              x={T}
              y={T}
              width={bw - 2 * T}
              height={BEHIND.h - 2 * T}
              rx={RI}
              fill={b.fill}
              stroke={stroke(b.edgeColor)}
              strokeWidth={hair}
            />
          </G>
        ) : null}

        <G x={FRONT.x} y={FRONT.y}>
          {folded ? (
            <>
              {/* The order here IS the fold: the sheet with its corner missing,
                  the colour inside it, the shadow the flap throws down and left
                  onto that colour, then the flap and its reverse on top. */}
              <Path
                d={sheetPath(fw, FRONT.h)}
                fill={matte}
                stroke={mountEdge}
                strokeWidth={hair}
              />
              <Path
                d={fillPath(fw, FRONT.h)}
                fill={f.fill}
                stroke={stroke(f.edgeColor)}
                strokeWidth={hair}
              />
              <Path d={flapShadowPath(fw)} fill="#000" fillOpacity={0.15} />
              <Path d={flapPath(fw)} fill={matte} />
              <Path d={flapFillPath(fw)} fill={mix(f.fill, matte, REVERSE_MIX)} />
            </>
          ) : (
            <>
              <Rect
                width={fw}
                height={FRONT.h}
                rx={R}
                fill={matte}
                stroke={mountEdge}
                strokeWidth={hair}
              />
              <Rect
                x={T}
                y={T}
                width={fw - 2 * T}
                height={FRONT.h - 2 * T}
                rx={RI}
                fill={f.fill}
                stroke={stroke(f.edgeColor)}
                strokeWidth={hair}
              />
            </>
          )}
        </G>
      </Svg>

      {/* An RN Text over the SVG rather than an SVG <Text>. react-native-svg
          draws text with its own font resolution and would miss the design
          system's loaded face, so the one word on this page would be the one
          word in the app not set in Inter. */}
      <Text
        variant="eyebrow"
        color={f.ink}
        numberOfLines={1}
        // The page is a fixed 53pt tall with about 41 of them visible. Scaled
        // type does not reflow here, it disappears behind the front face.
        maxFontSizeMultiplier={1}
        style={[
          styles.upNext,
          {
            left: FRONT.x + UP_NEXT.x,
            top: FRONT.y + UP_NEXT.y,
            opacity: UP_NEXT.opacity,
          },
        ]}
      >
        Up next
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  /**
   * `eyebrow` owns the capitals and the tracking; only the SIZE is overridden.
   * The peek is a miniature of the card below it, and 13pt of eyebrow on a page
   * this small reads as a headline rather than a label.
   */
  upNext: {
    position: "absolute",
    fontSize: UP_NEXT.size,
    lineHeight: 12,
  },
  band: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: PAGES_BAND,
  },
});
