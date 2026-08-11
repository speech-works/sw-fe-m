import React from "react";
import { View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useTheme } from "../useTheme";

export interface SegmentRingProps {
  /** How many slots the ring is divided into. `<= 1` renders one closed ring. */
  total: number;
  /** How many are filled. Clamped into 0..total. */
  done: number;
  size?: number;
  strokeWidth?: number;
  /** Filled-segment color (default brand). */
  color?: string;
  /** Unfilled-segment color (default `surface.track`). */
  trackColor?: string;
  /** Gap between segments, as a fraction of the circumference. */
  gap?: number;
  /** Centered content. */
  children?: React.ReactNode;
}

/**
 * ============================================================================
 * A RING THAT SHOWS ITS OWN DENOMINATOR
 * ----------------------------------------------------------------------------
 * `ProgressRing` draws one continuous arc from a 0..1 value, which is right for
 * a percentage and wrong for a count. A third of a circle tells you the
 * fraction; it cannot tell you that the whole is THREE, so the number has to be
 * repeated in text beside it — and on a card with no room for "three of what",
 * that text was a claim the user had to take on faith.
 *
 * Splitting the ring into `total` discrete arcs moves the denominator out of
 * the copy and into the shape. You can count the slots. The empty state is the
 * real win: at 0 done this is three visible empty bays rather than an arc of
 * length zero, which is indistinguishable from a bug.
 *
 * NOT A VARIANT OF `ProgressRing`. Its contract is a single 0..1 value and
 * bending it to also mean "m of n" would make the common case pay for the rare
 * one. Both are thin wrappers over the same two SVG circles; sharing the file
 * would save nothing worth the coupling.
 *
 * ROUND CAPS EAT INTO THE GAP. Each cap adds half a stroke width beyond the
 * arc's end, so the drawn gap is always narrower than `gap` implies. The
 * default is set with that in mind at the sizes this is used; if a caller needs
 * a much heavier stroke it should widen `gap` to match.
 * ============================================================================
 */
export const SegmentRing: React.FC<SegmentRingProps> = ({
  total,
  done,
  size = 96,
  strokeWidth = 10,
  color,
  trackColor,
  gap = 0.055,
  children,
}) => {
  const { colors } = useTheme();
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;

  const fill = color ?? colors.action.primary;
  const track = trackColor ?? colors.surface.track;

  const slots = Math.max(1, Math.floor(total));
  const filled = Math.max(0, Math.min(slots, Math.floor(done)));

  // One slot is not a segmented ring — it is a ring. Drawing a gap in it would
  // read as a rendering fault rather than as a division, so the gap collapses.
  const gapLen = slots > 1 ? c * gap : 0;
  const slotLen = c / slots;
  const segLen = Math.max(0, slotLen - gapLen);

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        {Array.from({ length: slots }, (_, i) => (
          <Circle
            key={i}
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={i < filled ? fill : track}
            strokeWidth={strokeWidth}
            strokeDasharray={`${segLen} ${c - segLen}`}
            // Negative, because the dash pattern advances clockwise from the
            // start point and each slot begins one slot-length further round.
            strokeDashoffset={-(i * slotLen)}
            strokeLinecap={slots > 1 ? "round" : "butt"}
            fill="none"
            // start at 12 o'clock, matching ProgressRing
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        ))}
      </Svg>
      {children ? (
        <View style={{ alignItems: "center", justifyContent: "center" }}>{children}</View>
      ) : null}
    </View>
  );
};
