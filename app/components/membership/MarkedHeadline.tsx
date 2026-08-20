import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { Text, typography, useTheme, useMotion, easing } from "../../design-system";

const AnimatedPath = Animated.createAnimatedComponent(Path);

/**
 * ===========================================================================
 * ONE WORD, MARKED
 * ---------------------------------------------------------------------------
 * A poster headline where a single word carries an annotation stroke that
 * draws itself when the page arrives.
 *
 * ── WHY IT IS ALLOWED TO MOVE ──────────────────────────────────────────────
 * This is the only decorative motion on the paywall, and the paywall is seen
 * a handful of times per person, ever. That is the frequency band where a
 * deliberate reveal earns its cost. The same stroke on something opened daily
 * would be an irritation by the third viewing.
 *
 * 520ms is longer than any UI transition in `motion.ts`, on purpose: this is
 * watched rather than used, and `easing.inOut` gives the line a hand-drawn
 * acceleration that `out` flattens.
 *
 * ── WHY THE MARK IS NOT ALWAYS THE SAME SHAPE ──────────────────────────────
 * An ellipse says "this word". An underline says "and this follows". Drawing
 * one mark three times in a row stops being emphasis and becomes a tic, so
 * the caller alternates them.
 *
 * ── WHY LINE TWO IS A ROW OF THREE TEXTS, NOT ONE ──────────────────────────
 * It was one `<Text>` with nested children, and the mark never appeared.
 * `onLayout` on a NESTED Text does not fire on iOS, so the measured width
 * stayed 0 and the whole SVG was skipped — silently, with no warning.
 *
 * A row of three siblings measures reliably AND gives the mark its true x
 * offset, which the nested version could only estimate from character counts.
 * The cost is that line two no longer wraps. That is acceptable here and
 * nowhere else: these three headlines are authored, short, and reviewed. A
 * longer line would need `adjustsFontSizeToFit`, not wrapping, because the
 * mark is bound to one word's box.
 *
 * ── REDUCED MOTION ─────────────────────────────────────────────────────────
 * The mark is present, complete, from the first frame. Reduced motion means
 * "do not move it", never "do not show it": the emphasis is information.
 * ===========================================================================
 */

export type MarkShape = "ellipse" | "underline";

/**
 * Path lengths, measured once rather than computed at runtime.
 *
 * React Native SVG has no `getTotalLength`, so a dash-offset draw needs the
 * length as a literal. These are the values for the two paths below at their
 * authored viewBox; changing a `d` string means re-measuring. Both are
 * over-estimates rather than under: a dash array longer than the path leaves
 * the line finished, while one that is too short leaves a permanent gap.
 */
const MARK_PATHS: Record<MarkShape, { d: string; length: number; width: number }> = {
  ellipse: {
    d: "M186 28 C186 12 146 4 100 4 C54 4 14 12 14 28 C14 44 54 53 100 53 C146 53 188 45 186 28 C184 15 160 8 128 6",
    length: 620,
    width: 2.4,
  },
  underline: {
    d: "M8 47 C 56 37, 140 37, 192 44",
    length: 200,
    width: 2.6,
  },
};

/** How far the mark reaches past the word. */
const OVERHANG_X = 10;
const OVERHANG_Y = 6;

export interface MarkedHeadlineProps {
  /** First line, full weight. */
  line1: string;
  /** Second line's leading words, in the lighter weight. Include the space. */
  line2Lead: string;
  /** The word that gets the mark. */
  marked: string;
  /** Anything after the marked word, e.g. a full stop. Lighter weight. */
  tail?: string;
  shape: MarkShape;
  /** The stroke colour. Follows the page's accent. */
  accent: string;
  /**
   * Changing this replays the draw. Pass something that differs when the page
   * becomes active, so returning to a page redraws rather than showing an
   * already-finished line, which reads as a broken animation.
   */
  playKey: number | string;
}

export const MarkedHeadline: React.FC<MarkedHeadlineProps> = ({
  line1,
  line2Lead,
  marked,
  tail,
  shape,
  accent,
  playKey,
}) => {
  const { colors } = useTheme();
  const { reduced } = useMotion();
  const mark = MARK_PATHS[shape];

  // The path's own units remaining to be drawn: `length` is undrawn, 0 is
  // complete. Named for what it means to the path, since it is read in a worklet.
  const offset = useSharedValue(reduced ? 0 : mark.length);

  // Measured on the WRAPPER view, which does fire onLayout, unlike a nested Text.
  const [box, setBox] = useState({ x: 0, w: 0 });

  useEffect(() => {
    if (reduced) {
      offset.value = 0;
      return;
    }
    offset.value = mark.length;
    offset.value = withDelay(180, withTiming(0, { duration: 520, easing: easing.inOut }));
  }, [playKey, reduced, offset, mark.length]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: offset.value,
  }));

  const lineH = typography.poster.lineHeight;

  return (
    <View>
      <Text style={[typography.poster, { color: colors.text.primary }]}>{line1}</Text>

      <View style={styles.row}>
        <Text style={[typography.poster, { color: colors.text.secondary }]}>
          {line2Lead}
        </Text>

        <View
          onLayout={(e) => {
            const { x, width } = e.nativeEvent.layout;
            // Guard the set: onLayout fires on every re-render, and setting
            // state unconditionally here is an infinite render loop.
            if (Math.abs(x - box.x) > 0.5 || Math.abs(width - box.w) > 0.5) {
              setBox({ x, w: width });
            }
          }}
        >
          <Text style={[typography.poster, { color: colors.text.primary }]}>{marked}</Text>
        </View>

        {tail ? (
          <Text style={[typography.poster, { color: colors.text.secondary }]}>{tail}</Text>
        ) : null}
      </View>

      {/* Absolutely positioned so the mark can overhang the word on all four
          sides without adding a pixel to the headline's layout box. A mark
          that reserved its overhang would push the whole page down. */}
      {box.w > 0 ? (
        <View
          pointerEvents="none"
          style={[
            styles.markLayer,
            {
              top: lineH - OVERHANG_Y,
              left: box.x - OVERHANG_X,
              width: box.w + OVERHANG_X * 2,
              height: lineH + OVERHANG_Y * 2,
            },
          ]}
        >
          {/* preserveAspectRatio is off on purpose: the mark is drawn AROUND
              the word, so stretching it to the word's box is the behaviour,
              not a distortion bug. */}
          <Svg width="100%" height="100%" viewBox="0 0 200 58" preserveAspectRatio="none">
            <AnimatedPath
              d={mark.d}
              stroke={accent}
              strokeWidth={mark.width}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={mark.length}
              animatedProps={animatedProps}
            />
          </Svg>
        </View>
      ) : null}
    </View>
  );
};

export default MarkedHeadline;

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "baseline" },
  markLayer: { position: "absolute" },
});
