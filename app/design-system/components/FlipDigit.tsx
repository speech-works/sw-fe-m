import React, { useEffect } from "react";
import Animated, {
  useAnimatedProps,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Svg, { Path, Text as SvgText } from "react-native-svg";
import { easing } from "../motion";

export interface FlipDigitProps {
  /** The number on the front face. */
  value: number;
  /** Rendered size in points. */
  size?: number;
  /** Milliseconds the block sits still between leans. */
  restMs?: number;
}

/* ── geometry ──────────────────────────────────────────────────────────────
   A cube projected by hand. Orthographic on purpose: every face comes out an
   exact parallelogram, which keeps the maths trivial and the edges perfectly
   shared — no seams, and no reliance on 3D features React Native does not have.

   The earlier attempts failed for exactly that reason. RN's transform system
   has no `translateZ`, no parent-level `perspective` and no `preserve-3d`, so
   a cube built from rotated Views comes apart mid-turn, and the fallback —
   growing a strip above the face — reads as a flap hinging, not as a solid.
   Drawing the projection ourselves sidesteps all of it. */

const VB = 40; // viewBox
const S = 24; // cube side
const H = S / 2;
const C = VB / 2; // centre

/** A fixed turn to the side. This is what keeps it a BLOCK when it is at rest:
 *  the right-hand face is always in view, so it never flattens to a rectangle. */
const YAW = (-20 * Math.PI) / 180;
/** A little of the top is always visible — the block is seen from slightly above,
 *  the way an object on a desk is. The lean adds to this rather than creating it. */
const PITCH_REST = 8;
const PITCH_LEAN = 22;

const COS_Y = Math.cos(YAW);
const SIN_Y = Math.sin(YAW);

const OUT_MS = 460;
const HOLD_MS = 520;
const BACK_MS = 600;

/** Top lightest, front mid, side darkest — one light source, above and in front. */
const FRONT = "#17161A";
const TOP = "#3C3A46";
const SIDE = "#0B0A0E";

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedText = Animated.createAnimatedComponent(SvgText);

/**
 * A SOLID BLOCK WITH THE DAY COUNT ON ITS FRONT FACE.
 *
 * Drawn as SVG polygons from a real cube projection, so it is a block at every
 * moment rather than a rectangle pretending. It sits still, leans forward far
 * enough to show more of its top, holds, and settles back.
 *
 * Only the three visible faces are drawn, painted back-to-front (side, top,
 * front) — with a convex solid that is the whole of hidden-surface removal.
 *
 * The digit rides on the front face: its baseline follows the face centre as
 * the block leans, so it stays planted on the surface instead of floating over
 * it. Deliberately not sheared with the face — at these angles that is about
 * seven degrees across one glyph, which costs nothing to skip and keeps every
 * animated value a plain number.
 *
 * Reduced motion holds it at the resting pose. The number is the point; the
 * lean is not load-bearing.
 */
export const FlipDigit: React.FC<FlipDigitProps> = ({
  value,
  size = 30,
  restMs = 1600,
}) => {
  const reduceMotion = useReducedMotion();
  /** 0 = resting pose, 1 = fully leaned. */
  const lean = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    lean.value = 0;
    lean.value = withRepeat(
      withSequence(
        // Out on ease-out so it is felt at once; back on ease-in-out so it
        // settles rather than snaps. The asymmetry is what reads as weight.
        withDelay(
          restMs,
          withTiming(1, { duration: OUT_MS, easing: easing.out }),
        ),
        withDelay(
          HOLD_MS,
          withTiming(0, { duration: BACK_MS, easing: easing.inOut }),
        ),
      ),
      -1,
      false,
    );
  }, [reduceMotion, restMs, lean]);

  /** The three face polygons plus the front face's centre, for the digit. */
  const geo = useDerivedValue(() => {
    const deg = PITCH_REST + lean.value * (PITCH_LEAN - PITCH_REST);
    const p = (deg * Math.PI) / 180;
    const cp = Math.cos(p);
    const sp = Math.sin(p);

    // Yaw about the vertical, then pitch about the horizontal. Orthographic —
    // no divide, so faces stay exact parallelograms.
    const at = (x: number, y: number, z: number) => {
      const x1 = x * COS_Y + z * SIN_Y;
      const z1 = -x * SIN_Y + z * COS_Y;
      const y2 = y * cp + z1 * sp;
      return [C + x1, C + y2] as const;
    };

    const quad = (
      a: readonly [number, number],
      b: readonly [number, number],
      c: readonly [number, number],
      d: readonly [number, number],
    ) =>
      `M ${a[0].toFixed(2)} ${a[1].toFixed(2)} L ${b[0].toFixed(2)} ${b[1].toFixed(2)} L ${c[0].toFixed(2)} ${c[1].toFixed(2)} L ${d[0].toFixed(2)} ${d[1].toFixed(2)} Z`;

    return {
      front: quad(at(-H, -H, H), at(H, -H, H), at(H, H, H), at(-H, H, H)),
      top: quad(at(-H, -H, -H), at(H, -H, -H), at(H, -H, H), at(-H, -H, H)),
      side: quad(at(H, -H, H), at(H, -H, -H), at(H, H, -H), at(H, H, H)),
      // Centre of the front face, which drops as the block leans.
      cx: C + H * SIN_Y,
      cy: C + H * COS_Y * sp,
    };
  }, [lean]);

  const frontProps = useAnimatedProps(() => ({ d: geo.value.front }));
  const topProps = useAnimatedProps(() => ({ d: geo.value.top }));
  const sideProps = useAnimatedProps(() => ({ d: geo.value.side }));
  const textProps = useAnimatedProps(() => ({
    x: geo.value.cx,
    y: geo.value.cy,
  }));

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${VB} ${VB}`}>
      {/* Back to front. A convex solid needs no more sorting than this. */}
      <AnimatedPath animatedProps={sideProps} fill={SIDE} />
      <AnimatedPath animatedProps={topProps} fill={TOP} />
      <AnimatedPath animatedProps={frontProps} fill={FRONT} />
      <AnimatedText
        animatedProps={textProps}
        fill="#FFFFFF"
        fontSize={14}
        fontWeight="bold"
        textAnchor="middle"
        // `central` rather than `middle`: it centres on the glyph box, so the
        // digit sits on the face's centre instead of riding above it.
        alignmentBaseline="central"
      >
        {value}
      </AnimatedText>
    </Svg>
  );
};

export default FlipDigit;
