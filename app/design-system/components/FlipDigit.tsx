import React, { useEffect } from "react";
import Animated, {
  useAnimatedProps,
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

/* Slower than a UI transition on purpose. Nothing here is answering a tap, so
   there is no responsiveness to protect — and a longer move covers the same
   distance in more frames, which means smaller steps and a smoother read even
   when a frame is dropped. */
const OUT_MS = 560;
const HOLD_MS = 480;
const BACK_MS = 820;

/** Top lightest, front mid, side darkest — one light source, above and in front. */
const FRONT = "#17161A";
const TOP = "#3C3A46";
const SIDE = "#0B0A0E";
/** Dimmer than the front digit — it is next, not now. */
const TOP_DIGIT = "#C9C6D4";

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedText = Animated.createAnimatedComponent(SvgText);

/* ── the pose table ─────────────────────────────────────────────────────────
   WHY THIS IS NOT COMPUTED PER FRAME.

   Animating a Path's `d` repaints — it is the one SVG animation that cannot be
   composited — so the frame budget has to go on the repaint and nothing else.
   The first version spent it elsewhere: every frame it ran trigonometry for
   twelve projected points, then built three path strings through twenty-four
   `toFixed` calls, then allocated an object to carry them, all on the UI
   thread. That is the stutter.

   Every pose the block can ever hold is baked once at module load instead, and
   a frame becomes an array lookup. 61 steps over a 14° lean is 0.23° apart —
   about a tenth of a pixel at the rendered size, so the quantisation is well
   under what a screen can show, and far finer than the frame rate anyway. */

const STEPS = 60;

const buildPoses = () => {
  const out = [];
  for (let i = 0; i <= STEPS; i++) {
    const deg = PITCH_REST + (i / STEPS) * (PITCH_LEAN - PITCH_REST);
    const p = (deg * Math.PI) / 180;
    const cp = Math.cos(p);
    const sp = Math.sin(p);

    // Yaw about the vertical, then pitch about the horizontal. Orthographic —
    // no divide, so faces stay exact parallelograms and edges stay shared.
    const at = (x: number, y: number, z: number): [number, number] => {
      const x1 = x * COS_Y + z * SIN_Y;
      const z1 = -x * SIN_Y + z * COS_Y;
      return [C + x1, C + (y * cp + z1 * sp)];
    };
    const quad = (
      a: [number, number],
      b: [number, number],
      c: [number, number],
      d: [number, number],
    ) =>
      `M${a[0].toFixed(2)} ${a[1].toFixed(2)}L${b[0].toFixed(2)} ${b[1].toFixed(2)}L${c[0].toFixed(2)} ${c[1].toFixed(2)}L${d[0].toFixed(2)} ${d[1].toFixed(2)}Z`;

    out.push({
      front: quad(at(-H, -H, H), at(H, -H, H), at(H, H, H), at(-H, H, H)),
      top: quad(at(-H, -H, -H), at(H, -H, -H), at(H, -H, H), at(-H, -H, H)),
      side: quad(at(H, -H, H), at(H, -H, -H), at(H, H, -H), at(H, H, H)),
      // Centre of the front face, which drops as the block leans.
      cx: C + H * SIN_Y,
      cy: C + H * COS_Y * sp,
      // Centre of the TOP face, and how hard that face is foreshortened. The
      // squash is not optional the way the front's is: at rest the top is a
      // few units tall and an unsquashed glyph would stand right off it.
      tx: C,
      ty: C - H * cp,
      tSquash: (sp / Math.sin((PITCH_LEAN * Math.PI) / 180)) * 0.62,
    });
  }
  return out;
};

const POSES = buildPoses();

/** Worklet-safe clamp into the table. */
const poseIndex = (t: number) => {
  "worklet";
  const i = Math.round(t * STEPS);
  return i < 0 ? 0 : i > STEPS ? STEPS : i;
};

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
  restMs = 1800,
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

  // Index straight into the table. Reads one array entry and one number per
  // frame — no trigonometry, no string building, no allocation on the UI
  // thread. Clamped because the easing can graze outside [0, 1].
  const frontProps = useAnimatedProps(() => ({
    d: POSES[poseIndex(lean.value)].front,
  }));
  const topProps = useAnimatedProps(() => ({
    d: POSES[poseIndex(lean.value)].top,
  }));
  const sideProps = useAnimatedProps(() => ({
    d: POSES[poseIndex(lean.value)].side,
  }));
  const textProps = useAnimatedProps(() => ({
    x: POSES[poseIndex(lean.value)].cx,
    y: POSES[poseIndex(lean.value)].cy,
  }));

  // Translate to the top face, then squash. Drawn at the local origin so the
  // scale acts about the glyph rather than about the viewBox corner.
  //
  // translate + scale ONLY, deliberately. The full placement would also carry
  // a shear from the yaw, but a general affine means an animated transform
  // MATRIX, and this repo already has a scar from animated SVG props that
  // silently never arrived (see IdentityBlock). These three are the shapes
  // BreathingFace already proves work here. The shear it drops is under two
  // units across a glyph that is six pixels tall.
  const topTextProps = useAnimatedProps(() => {
    const pose = POSES[poseIndex(lean.value)];
    return {
      opacity: pose.tSquash,
      transform: [
        { translateX: pose.tx },
        { translateY: pose.ty },
        { scaleY: pose.tSquash },
      ],
    };
  });

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${VB} ${VB}`}>
      {/* Back to front. A convex solid needs no more sorting than this. */}
      <AnimatedPath animatedProps={sideProps} fill={SIDE} />
      <AnimatedPath animatedProps={topProps} fill={TOP} />
      {/* Tomorrow's number, on the face that will roll into the front. Drawn
          before the front face so a glyph that overshoots is clipped by the
          solid rather than floating over it. Absent at one day, where the next
          value is zero — a number the copy never prints has no business on the
          object. */}
      {value - 1 >= 1 ? (
        <AnimatedText
          animatedProps={topTextProps}
          x={0}
          y={0}
          fill={TOP_DIGIT}
          fontSize={12}
          fontWeight="bold"
          textAnchor="middle"
          alignmentBaseline="central"
        >
          {value - 1}
        </AnimatedText>
      ) : null}
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
