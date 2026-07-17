import React from "react";
import { Path, Circle, Ellipse, Rect } from "react-native-svg";
import { HEAD, CX, GOLD, INK } from "./avatarKit";

/**
 * The avatar part catalog, drawn in the construction language of the
 * sw-faces-studio occupation faces (the reference set the user pointed at):
 *
 * Style: Snoo-adapted (per the Reddit-builder redirect) — every shape is a
 * FLAT fill plus the shared INK outline. Users recolor fills, never strokes.
 * No gradients, no facial modeling (no nose, no brows): face = eyes + smile,
 * and all personality lives in the gear/hair silhouettes.
 *
 * - A hat is a CLOSED dome shape drawn ON TOP of the head — its sides start
 *   wider than the head's measured edges, and its bottom edge is a curve that
 *   HUGS the skull (rises over the forehead, drops at the temples).
 * - Hair is a mass masked to the head; the sculpted hairline (pointed locks,
 *   curl scallops) is the style, inked along its edge.
 * - One bright focal detail per earned piece (badge, star, glow).
 *
 * Fixed brand constraints the studio faces do NOT share: our eyes are anchored
 * at (16,22)/(32,22), so every hat edge stays above y≈18.8 at the eye columns.
 * Head contour: crown y=8 · x 6.24→43.11 at y=20 · x 6.07→43.27 at y=24.
 */

export interface PartProps {
  colors: { skin: string; hair: string; bg: string };
}

/** The Snoo idiom: a flat fill + the shared ink outline. Used for every hat
 *  dome, brim, band, and prop body — one line quality across the whole set. */
const Inked: React.FC<{ d: string; fill: string }> = ({ d, fill }) => (
  <>
    <Path d={d} fill={fill} />
    <Path d={d} fill="none" stroke={INK} strokeWidth={1.1} strokeLinejoin="round" />
  </>
);

// Aliases kept so part definitions read naturally (dome vs flat piece).
const Dome = Inked;
const Sheen = Inked;

const Star4: React.FC<{ x: number; y: number; s: number; fill: string }> = ({ x, y, s, fill }) => (
  <Path
    transform={`translate(${x} ${y})`}
    d={`M0 ${-s} L${0.3 * s} ${-0.3 * s} L${s} 0 L${0.3 * s} ${0.3 * s} L0 ${s} L${-0.3 * s} ${0.3 * s} L${-s} 0 L${-0.3 * s} ${-0.3 * s} Z`}
    fill={fill}
  />
);

// ── Head + face (the fixed brand pieces) ─────────────────────────────────────

/** Flat skin + the ink outline — the whole head, Snoo-style. */
export const ClassicHead: React.FC<PartProps> = ({ colors }) => (
  <>
    <Path fill={colors.skin} d={HEAD} />
    <Path fill="none" stroke={INK} strokeWidth={1.2} strokeLinejoin="round" d={HEAD} />
  </>
);

/** Iris ring color — a deep warm navy, universal across skin tones. The
 *  reference "cute" eyes are mostly a big black pupil inside a thin ring. */
const IRIS = "#2E2A44";

/** One eye, matched to the reference's cute panel: a big white egg (now with
 *  the shared ink outline, like Snoo), a large dark pupil ringed by a thin
 *  iris, sitting LOW and slightly INWARD — plus one small catchlight. */
const AvatarEye: React.FC<{ cx: number; irisDx: number }> = ({ cx, irisDx }) => {
  const cy = 22;
  const ix = cx + irisDx;
  const iy = cy + 1.1; // low in the egg — the endearing look-down
  return (
    <>
      <Ellipse cx={cx} cy={cy} rx={3.1} ry={4} fill="#FFFFFF" />
      <Ellipse cx={cx} cy={cy} rx={3.1} ry={4} fill="none" stroke={INK} strokeWidth={0.6} />
      <Circle cx={ix} cy={iy} r={2.15} fill={IRIS} />
      <Circle cx={ix} cy={iy} r={1.55} fill="#0B0A10" />
      <Circle cx={ix - 0.7} cy={iy - 0.8} r={0.6} fill="#FFFFFF" />
    </>
  );
};

/** The one brand face (one-face rule): eyes + smile, nothing else. */
export const BrandFace: React.FC<PartProps> = () => {
  return (
    <>
      {/* irises angled gently inward + low — the endearing gaze from the ref.
          NO nose, no brows, no shading: the face is eyes + smile, like Snoo. */}
      <AvatarEye cx={16} irisDx={0.55} />
      <AvatarEye cx={32} irisDx={-0.55} />
      {/* one clean, confident ink smile. */}
      <Path
        d="M19 30.2 Q24.675 34.6 30.35 30.2"
        fill="none"
        stroke={INK}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </>
  );
};

// ── Hair — the studio mask trick + the reference's FLICKED POINTED TIPS.
//    A full mass is masked to `#av-head` (the silhouette is guaranteed), and the
//    HAIRLINE is a run of sharp lock tips (L-command points, not smooth arcs) —
//    higher over the eyes, dipping at the centre part and flicking down at the
//    temples. Strand strokes give flow, a lighter top shade gives sheen.
//    Constraint the reference doesn't have: every tip at the eye columns
//    (x≈16/32) stays above the sclera (y≈18) so hair never covers the eyes.

const HairMass: React.FC<{
  base: string;
  locks?: [string, number][]; // retired by the flat style; kept for signature stability
  strands: string;
  color: string;
}> = ({ base, strands, color }) => (
  <>
    <Path d={base} fill={color} mask="url(#av-head)" />
    {/* the ink line along the hairline — the silhouette carries the style. */}
    <Path
      d={base}
      fill="none"
      stroke={INK}
      strokeWidth={1}
      strokeLinejoin="round"
      mask="url(#av-head)"
    />
    <Path
      d={strands}
      fill="none"
      stroke={INK}
      strokeWidth={0.6}
      strokeLinecap="round"
      opacity={0.45}
      mask="url(#av-head)"
    />
  </>
);

/** Neat textured crop: an even row of short lock tips, soft centre peak. */
export const HairCrop: React.FC<PartProps> = ({ colors }) => (
  <HairMass
    color={colors.hair}
    base="M2 2 H46 V18 L42.5 18.5 L40 15.5 L36 17 L32 15 L28 16.5 L24 14.8 L20 16.5 L16 15 L12 17 L8 15.5 L5.5 18.5 L2 18 Z"
    locks={[
      ["M40 15.5 L38.5 17.8 L36 17 L37.5 15.2 Z", 0.13],
      ["M28 16.5 L26 14.9 L24 14.8 L25.5 16.6 Z", -0.13],
      ["M20 16.5 L18 14.9 L16 15 L17.5 16.6 Z", 0.13],
      ["M8 15.5 L6.5 17.8 L5.5 18.5 L7 15.3 Z", -0.13],
    ]}
    strands="M12 13 L15 11 M20 12.5 L23 10.5 M27 12.5 L30 10.5 M35 13 L38 11"
  />
);

/** Side-swept: locks sweeping down to a long right temple flick. */
export const HairSwoop: React.FC<PartProps> = ({ colors }) => (
  <HairMass
    color={colors.hair}
    base="M2 2 H46 V16 L43 25 L40 16 L37 21 L34 15 L27 20 L24 14.5 L21 20 L16 14 L11 21 L8 16 L5 24 L2 20 Z"
    locks={[
      ["M43 25 L41.5 16 L40 16 L41 24 Z", -0.16],
      ["M37 21 L35.5 15.5 L34 15 L35 20.5 Z", 0.16],
      ["M27 20 L25.5 14.8 L24 14.5 L25 19.5 Z", -0.16],
      ["M21 20 L18.5 14.4 L16 14 L18 19.5 Z", 0.16],
      ["M11 21 L9.5 16 L8 16 L9 20.5 Z", -0.16],
    ]}
    strands="M10 14 L16 9.5 M18 15 L25 10.5 M26 15 L34 11 M35 15.5 L42 12.5"
  />
);

/** Curly: rounded curl clusters (the one style that stays round, not pointed). */
export const HairCurls: React.FC<PartProps> = ({ colors }) => (
  <HairMass
    color={colors.hair}
    base="M2 2 H46 V19 Q43.5 22 41 19 Q39.5 21.5 37 18.5 Q35.5 20.5 33 17.5 Q31.5 19.5 29 16.5 Q27 18.5 24.5 15.8 Q22.5 18 20 15.5 Q18 17.8 15.5 15 Q14 17.5 11.5 15 Q9.5 20 7 18.5 Q4.5 21 2 19 Z"
    locks={[
      ["M41 19 Q42.5 16.5 44 19 Q42.5 20.5 41 19 Z", 0.16],
      ["M33 17.5 Q34.5 14.8 36 17.5 Q34.5 19 33 17.5 Z", -0.14],
      ["M24.5 15.8 Q26 13 27.5 15.8 Q26 17.3 24.5 15.8 Z", 0.16],
      ["M15.5 15 Q17 12.5 18.5 15 Q17 16.8 15.5 15 Z", -0.14],
      ["M7 18.5 Q8.5 16 10 18.5 Q8.5 20 7 18.5 Z", 0.16],
    ]}
    strands="M12 15 Q14 12.5 16 15 M21 13.5 Q23.5 11 26 13.5 M30 14 Q32.5 12 35 14.5"
  />
);

/** Soft waves: an S-curved fringe (not spiky) + medium side flicks. */
export const HairWaves: React.FC<PartProps> = ({ colors }) => (
  <HairMass
    color={colors.hair}
    base="M2 2 H46 V16 L43 25 Q41 17.5 38.5 20 Q36 15.5 33 17 Q30 20 27 16.2 Q25.5 18.4 24 15.4 Q22.5 18.4 21 16.2 Q18 20 15 17 Q12 15.5 9.5 20 Q7 17.5 5 25 L2 21 Z"
    locks={[
      ["M38.5 20 Q40 16.5 41.5 18.5 Q40 20.5 38.5 20 Z", 0.15],
      ["M27 16.2 Q28.5 13.8 30 16 Q28.5 17.8 27 16.2 Z", -0.13],
      ["M21 16.2 Q19.5 13.8 18 16 Q19.5 17.8 21 16.2 Z", 0.15],
      ["M9.5 20 Q8 16.5 6.5 18.5 Q8 20.5 9.5 20 Z", -0.13],
    ]}
    strands="M8 18 Q6.8 22.5 8 25 M40 18 Q41.2 22.5 40 25 M14 13.5 Q19 11 24 12.5 Q29 11 34 13.5"
  />
);

// ── Headgear ─────────────────────────────────────────────────────────────────

export const Beanie: React.FC<PartProps> = () => (
  <>
    <Dome d="M5.4 18 Q5.6 7.2 8 5.4 Q15 2.6 24.675 2.6 Q34.4 2.6 41.4 5.4 Q43.8 7.2 44 18 Q24.675 14.6 5.4 18 Z" fill="#3A6EA5" />
    {/* knit ribs */}
    <Path
      d="M12.6 5.2 Q13.6 9.8 13 14.6 M18.6 3.4 Q19.4 8.6 19 15.4 M24.675 2.6 L24.675 15.8 M30.75 3.4 Q29.95 8.6 30.35 15.4 M36.75 5.2 Q35.75 9.8 36.35 14.6"
      fill="none"
      stroke="#2C5580"
      strokeWidth={0.8}
      opacity={0.6}
    />
    {/* folded band */}
    <Sheen d="M4.6 17.2 Q24.675 13.4 44.8 17.2 L44.8 21.4 Q24.675 17.6 4.6 21.4 Z" fill="#2C5580" />
    {/* pom */}
    <Circle cx={CX} cy={1.6} r={2.5} fill="#5B8CBF" />
    <Circle cx={23.9} cy={0.9} r={0.9} fill="#FFF" opacity={0.5} />
  </>
);

export const BallCap: React.FC<PartProps> = () => (
  <>
    <Dome d="M5.6 17 Q5.8 6.6 8.2 4.9 Q15.2 2.2 24.675 2.2 Q34.2 2.2 41.2 4.9 Q43.6 6.6 43.8 17 Q24.675 13.6 5.6 17 Z" fill="#C0504C" />
    {/* panel seams + button */}
    <Path d="M24.675 2.2 L24.675 14.9 M15.5 3.4 Q17.5 8.6 17 14.2 M33.85 3.4 Q31.85 8.6 32.35 14.2" fill="none" stroke="#A5433F" strokeWidth={0.7} opacity={0.7} />
    <Circle cx={CX} cy={2.2} r={1.1} fill="#A5433F" />
    {/* curved visor with a gloss line */}
    <Sheen d="M4.9 16.4 Q24.675 12.8 44.45 16.4 Q42.6 19.6 24.675 18.9 Q6.75 19.6 4.9 16.4 Z" fill="#A5433F" />
    <Path d="M9.5 16.9 Q24.675 14.9 39.85 16.9" fill="none" stroke="#D97B76" strokeWidth={0.8} strokeLinecap="round" opacity={0.6} />
  </>
);

/** Exact geometry from the Cognitive category icon — already contour-verified. */
export const Headphones: React.FC<PartProps> = () => (
  <>
    <Path
      d="M8.075 22C8.075 12 15 7 24.675 7 34.35 7 41.275 12 41.275 22"
      fill="none"
      stroke="#A9F0D1"
      strokeWidth={4}
      strokeLinecap="round"
    />
    <Rect x={4.375} y={20.1} width={7.4} height={14.2} rx={3.7} fill="#A9F0D1" />
    <Rect x={37.575} y={20.1} width={7.4} height={14.2} rx={3.7} fill="#A9F0D1" />
    <Path d="M8.075 23.3v7.8M41.275 23.3v7.8" fill="none" stroke="#3D9C7C" strokeWidth={2} strokeLinecap="round" />
  </>
);

/** Seeker's kit: the eager beginner's bucket hat. */
export const TouristHat: React.FC<PartProps> = () => (
  <>
    <Dome d="M6.4 15.6 Q6.6 6.8 9 5.2 Q16 2.8 24.675 2.8 Q33.35 2.8 40.35 5.2 Q42.75 6.8 42.95 15.6 Q24.675 12.4 6.4 15.6 Z" fill="#D9C79E" />
    <Path d="M5.8 15 Q24.675 11.8 43.55 15 L43.55 17.4 Q24.675 14.2 5.8 17.4 Z" fill="#B09A6A" />
    {/* floppy bucket brim, tilted down */}
    <Sheen d="M3 15.4 Q24.675 11.6 46.35 15.4 Q45.1 19.2 24.675 18.2 Q4.25 19.2 3 15.4 Z" fill="#C9B68A" />
    <Path d="M5.8 16.4 Q24.675 14.4 43.55 16.4" fill="none" stroke="#A8926A" strokeWidth={0.7} strokeLinecap="round" opacity={0.6} />
  </>
);

const ExplorerBase: React.FC<{ starred?: boolean }> = ({ starred }) => (
  <>
    <Dome d="M6 14.8 Q6.2 5 8.6 3.6 Q15.4 1.4 24.675 1.4 Q33.95 1.4 40.75 3.6 Q43.15 5 43.35 14.8 Q24.675 11.6 6 14.8 Z" fill="#8A6240" />
    {/* crown crease */}
    <Path d="M19 3 Q24.675 1.2 30.35 3" fill="none" stroke="#5E4128" strokeWidth={0.9} strokeLinecap="round" opacity={0.75} />
    <Path d="M24.675 1.6 L24.675 4.6" stroke="#5E4128" strokeWidth={0.7} opacity={0.5} />
    {/* leather band + buckle */}
    <Path d="M5.4 14.2 Q24.675 11 43.95 14.2 L43.95 16.8 Q24.675 13.6 5.4 16.8 Z" fill="#4A3320" />
    <Rect x={27.2} y={12.6} width={1.6} height={2.6} rx={0.4} fill="#C9A05A" />
    {/* wide adventurer's brim, edges swept up */}
    <Sheen d="M0.9 16.9 Q12.3 13 24.675 13.9 Q37 13 48.45 16.9 Q46.35 19.9 34.4 18.5 Q24.675 19.9 14.95 18.5 Q3 19.9 0.9 16.9 Z" fill="#6E4C30" />
    {starred ? (
      <>
        <Star4 x={CX} y={7.6} s={2} fill={GOLD} />
        <Path d="M23.6 6.7 L25.75 6.7" stroke="#FFF" strokeWidth={0.7} strokeLinecap="round" opacity={0.8} />
      </>
    ) : null}
  </>
);

/** Pathfinder's kit: the wide-brim explorer hat. */
export const ExplorerHat: React.FC<PartProps> = () => <ExplorerBase />;

/** North Star's upgrade: the explorer hat wearing its gold star. */
export const ExplorerHatStar: React.FC<PartProps> = () => <ExplorerBase starred />;

// ── Eyewear (lenses centred on the eye anchors 16,22 / 32,22) ────────────────

export const RoundGlasses: React.FC<PartProps> = () => (
  <>
    <Circle cx={16} cy={22} r={5.2} fill="#FFF" fillOpacity={0.1} />
    <Circle cx={32} cy={22} r={5.2} fill="#FFF" fillOpacity={0.1} />
    <Circle cx={16} cy={22} r={5.2} fill="none" stroke="#2A2530" strokeWidth={1.5} />
    <Circle cx={32} cy={22} r={5.2} fill="none" stroke="#2A2530" strokeWidth={1.5} />
    <Path d="M21.2 22 H26.8" stroke="#2A2530" strokeWidth={1.5} />
    <Path d="M10.8 21 L6.9 19.6 M37.2 21 L41.1 19.6" stroke="#2A2530" strokeWidth={1.5} strokeLinecap="round" />
    <Path d="M13.2 19.4 Q14.6 18.2 16.6 18.4 M29.2 19.4 Q30.6 18.2 32.6 18.4" fill="none" stroke="#FFF" strokeWidth={0.7} strokeLinecap="round" opacity={0.5} />
  </>
);

export const SquareGlasses: React.FC<PartProps> = () => (
  <>
    <Rect x={10.5} y={17.6} width={11} height={8.8} rx={2.2} fill="#FFF" fillOpacity={0.1} />
    <Rect x={26.5} y={17.6} width={11} height={8.8} rx={2.2} fill="#FFF" fillOpacity={0.1} />
    <Rect x={10.5} y={17.6} width={11} height={8.8} rx={2.2} fill="none" stroke="#2A2530" strokeWidth={1.5} />
    <Rect x={26.5} y={17.6} width={11} height={8.8} rx={2.2} fill="none" stroke="#2A2530" strokeWidth={1.5} />
    <Path d="M21.5 21.4 H26.5" stroke="#2A2530" strokeWidth={1.5} />
    <Path d="M10.5 20 L6.6 18.8 M37.5 20 L41.4 18.8" stroke="#2A2530" strokeWidth={1.5} strokeLinecap="round" />
    <Path d="M12.2 19.2 L14.6 18.6 M28.2 19.2 L30.6 18.6" stroke="#FFF" strokeWidth={0.7} strokeLinecap="round" opacity={0.5} />
  </>
);

/** Voyager's kit: aviators. Lenses sized to FULLY cover the sclera (cx 16/32,
 *  rx 3.1, ry 4 → x 12.9→19.1 / 28.9→35.1, y 18→26): opaque, no eye peeking out
 *  below — the bug from the first Voyager render. */
export const Aviators: React.FC<PartProps> = () => (
  <>
    <Sheen d="M10.3 16.8 H21.7 Q22.2 25.4 16 27.2 Q9.8 25.6 10.3 16.8 Z" fill="#23202B" />
    <Sheen d="M39.05 16.8 H27.65 Q27.15 25.4 33.35 27.2 Q39.55 25.6 39.05 16.8 Z" fill="#23202B" />
    <Path d="M9.9 16.8 H39.4" stroke="#8B8B96" strokeWidth={1.3} strokeLinecap="round" />
    <Path d="M21.7 17.6 Q24.675 16 27.65 17.6" fill="none" stroke="#8B8B96" strokeWidth={1.2} />
    <Path d="M9.9 17.6 L5.9 16.9 M39.4 17.6 L43.4 16.9" stroke="#8B8B96" strokeWidth={1.2} strokeLinecap="round" />
    <Path d="M12 19 Q14 18 16.4 18.4" fill="none" stroke="#FFF" strokeWidth={0.9} strokeLinecap="round" opacity={0.4} />
    <Path d="M29.6 19 Q31.6 18 34 18.4" fill="none" stroke="#FFF" strokeWidth={0.9} strokeLinecap="round" opacity={0.4} />
  </>
);

// ── Props (beside the avatar, rendered OUTSIDE the tile mask) ────────────────

export const MicProp: React.FC<PartProps> = () => (
  <>
    <Sheen d="M37 37 Q37 33 41 33 Q45 33 45 37 L45 42 Q45 46 41 46 Q37 46 37 42 Z" fill="#2E2A33" />
    {/* grille */}
    <Path d="M38 36 H44 M38 38.5 H44 M39.5 34 V45 M42.5 34 V45" stroke="#8A8A99" strokeWidth={0.6} opacity={0.8} />
    <Path d="M37 42 Q41 47.5 45 42" fill="none" stroke="#2E2A33" strokeWidth={1.6} strokeLinecap="round" />
    <Path d="M41 46.5 V51" stroke="#2E2A33" strokeWidth={1.6} />
    <Path d="M37.5 51 H44.5" stroke="#2E2A33" strokeWidth={1.6} strokeLinecap="round" />
  </>
);

export const BookProp: React.FC<PartProps> = () => (
  <>
    <Sheen d="M33 39 L47 36 L47 49 L33 52 Z" fill="#C1543F" />
    <Path d="M33 39 L33 52 L31 51 L31 38 Z" fill="#9C4230" />
    <Path d="M35.5 40.5 L45 38.6 M35.5 43.5 L45 41.6 M35.5 46.5 L45 44.6" stroke="#F3D9C0" strokeWidth={0.7} strokeLinecap="round" opacity={0.9} />
    {/* ribbon */}
    <Path d="M44 36.6 L44 40 L45.2 38.9 L46.4 39.6 L46.4 36.1 Z" fill={GOLD} />
  </>
);

/** Seeker's kit: the tourist's camera. */
export const CameraProp: React.FC<PartProps> = () => (
  <>
    <Sheen d="M1.8 37.7 Q1.8 35.5 4 35.5 L12.2 35.5 Q14.4 35.5 14.4 37.7 L14.4 42.5 Q14.4 44.7 12.2 44.7 L4 44.7 Q1.8 44.7 1.8 42.5 Z" fill="#3E4450" />
    <Rect x={10.9} y={33.9} width={3} height={2} rx={0.8} fill="#262B33" />
    <Rect x={3.4} y={34} width={2.6} height={1.6} rx={0.8} fill="#98A6B8" />
    <Circle cx={8.1} cy={40.1} r={3.2} fill="#262B33" />
    <Circle cx={8.1} cy={40.1} r={3.2} fill="none" stroke="#98A6B8" strokeWidth={0.7} />
    <Circle cx={8.1} cy={40.1} r={1.7} fill="#6FA0C8" />
    <Circle cx={7.3} cy={39.3} r={0.6} fill="#FFF" opacity={0.85} />
    <Circle cx={12.9} cy={37.3} r={0.5} fill="#E05B4F" />
  </>
);

/** Pathfinder's kit: a brass compass — a pathfinder finds routes. */
export const CompassProp: React.FC<PartProps> = () => (
  <>
    <Circle cx={7.8} cy={40.2} r={5.4} fill="#C9A05A" />
    <Circle cx={7.8} cy={40.2} r={5.4} fill="none" stroke={INK} strokeWidth={1} />
    <Circle cx={7.8} cy={40.2} r={4.2} fill="#F3E9D6" />
    <Rect x={7.1} y={33.6} width={1.4} height={1.6} rx={0.5} fill="#C9A05A" />
    <Path d="M7.8 36.6 V37.5 M7.8 42.9 V43.8 M4.2 40.2 H5.1 M10.5 40.2 H11.4" stroke="#A8926A" strokeWidth={0.6} />
    <Path d="M7.8 37.2 L9 40.2 L6.6 40.2 Z" fill="#C0504C" />
    <Path d="M7.8 43.2 L9 40.2 L6.6 40.2 Z" fill="#4A4A55" />
    <Circle cx={7.8} cy={40.2} r={0.7} fill="#4A3320" />
  </>
);

/** Catalyst's kit: the lantern — carrying the light others follow. Its warm
 *  glow is the only "aura" in the system, and it's diegetic. */
export const LanternProp: React.FC<PartProps> = () => (
  <>
    <Circle cx={8.2} cy={39.8} r={7.5} fill={GOLD} opacity={0.28} />
    <Path d="M6 32.9 Q8.2 30.2 10.4 32.9" fill="none" stroke="#3B3430" strokeWidth={1.2} strokeLinecap="round" />
    <Rect x={5.6} y={32.9} width={5.2} height={1.6} rx={0.8} fill="#3B3430" />
    <Sheen d="M4.4 36 Q4.4 34.2 6.2 34.2 L10.2 34.2 Q12 34.2 12 36 L12 42.8 Q12 44.6 10.2 44.6 L6.2 44.6 Q4.4 44.6 4.4 42.8 Z" fill="#3B3430" />
    <Rect x={5.9} y={36.2} width={4.6} height={6.2} rx={1} fill={GOLD} />
    <Path d="M8.2 41.2 Q9.4 39.4 8.2 37.6 Q7 39.4 8.2 41.2 Z" fill="#FF9040" />
    <Circle cx={8.2} cy={39.6} r={0.7} fill="#FFF3E0" opacity={0.9} />
  </>
);

/** North Star's kit: the white summit flag. The gold star on the pennant is
 *  what makes white read as "summit marker", not surrender. */
export const FlagProp: React.FC<PartProps> = () => (
  <>
    <Rect x={42.6} y={7.5} width={1.3} height={38} rx={0.6} fill="#7A6A55" />
    <Circle cx={43.25} cy={7} r={1.1} fill="#C9A05A" />
    <Sheen d="M44.1 8.6 L55.4 12.4 L44.1 16.2 Z" fill="#F5F1E8" />
    <Path d="M44.1 8.6 L55.4 12.4 L44.1 16.2" fill="none" stroke="#D9D2C4" strokeWidth={0.6} />
    <Star4 x={48.6} y={12.4} s={1.5} fill={GOLD} />
  </>
);
