import React from "react";
import { G, Path, Circle, Ellipse, Rect, ClipPath } from "react-native-svg";
import { HEAD, CX, GOLD, INK, shade, trimOf, hue } from "./avatarKit";

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
  colors: { skin: string; hair: string; bg: string; collar: string };
  /** Hair only: which sub-layer to render. "back" = the drape drawn BEHIND the
   *  head (hangs at the sides/shoulders, shows below a hat brim); "front" = the
   *  crown drawn ON the head (what a hat covers). Undefined = both, in place
   *  (used by standalone previews where nothing sits between the two). */
  layer?: "back" | "front";
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

/** A rounded gold ball for a crown point tip — filled gold, a fine warm edge,
 *  and one soft highlight so the tip reads as a jewel bead, not a flat disc. */
const CrownBall: React.FC<{ x: number; y: number; r: number }> = ({ x, y, r }) => (
  <>
    <Circle cx={x} cy={y} r={r} fill={GOLD} />
    <Circle cx={x} cy={y} r={r} fill="none" stroke="#C88A1A" strokeWidth={0.5} />
    <Circle cx={x - r * 0.35} cy={y - r * 0.35} r={r * 0.32} fill="#FFFFFF" opacity={0.55} />
  </>
);

/** A clean 5-point star (sheriff / cowboy badge) — outer radius s, classic
 *  0.382 inner ratio, thin ink edge so gold reads crisp on a brown hat. */
const Star5: React.FC<{ x: number; y: number; s: number; fill: string }> = ({ x, y, s, fill }) => (
  <Path
    transform={`translate(${x} ${y})`}
    d={`M0 ${-s} L${0.2245 * s} ${-0.309 * s} L${0.951 * s} ${-0.309 * s} L${0.3633 * s} ${0.1181 * s} L${0.5878 * s} ${0.809 * s} L0 ${0.382 * s} L${-0.5878 * s} ${0.809 * s} L${-0.3633 * s} ${0.1181 * s} L${-0.951 * s} ${-0.309 * s} L${-0.2245 * s} ${-0.309 * s} Z`}
    fill={fill}
    stroke={INK}
    strokeWidth={0.35}
    strokeLinejoin="round"
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

/** The open-smile outline — shared by the fill, the interior clip, and the
 *  outline stroke so the three can never drift apart. */
const MOUTH = "M19 29.7 Q24.675 30.9 30.35 29.7 Q30.1 35.2 24.675 35.7 Q19.25 35.2 19 29.7 Z";

/** Animated open smile (the reference sheet's "A"/"L N" mouth): dark interior
 *  + white upper-teeth band + tongue, all flat fills clipped to the shape. */
const OpenSmile: React.FC = () => (
  <>
    <ClipPath id="av-mouth">
      <Path d={MOUTH} />
    </ClipPath>
    <Path d={MOUTH} fill={INK} />
    <G clipPath="url(#av-mouth)">
      <Path
        d="M19.5 29.9 Q24.675 31.1 29.85 29.9 Q29.7 32 24.675 32.4 Q19.65 32 19.5 29.9 Z"
        fill="#FFFFFF"
      />
      <Ellipse cx={24.675} cy={35.7} rx={2.9} ry={1.9} fill="#E2707E" />
    </G>
    <Path d={MOUTH} fill="none" stroke={INK} strokeWidth={0.7} strokeLinejoin="round" />
  </>
);

/** Closed tapered smile — thick middle tapering to points, Snoo-style. */
const TaperedSmile: React.FC = () => (
  <Path d="M18.6 30.4 Q24.675 35.6 30.75 30.4 Q28 33 24.675 33.1 Q21.3 33 18.6 30.4 Z" fill={INK} />
);

/** A happy closed eye — the upward arc. */
const ClosedEye: React.FC<{ cx: number }> = ({ cx }) => (
  <Path
    d={`M${cx - 3.1} 22.4 Q${cx} 19.4 ${cx + 3.1} 22.4`}
    fill="none"
    stroke={INK}
    strokeWidth={1.3}
    strokeLinecap="round"
  />
);

/** A wide surprised eye — bigger egg, centered pupil. */
const WideEye: React.FC<{ cx: number }> = ({ cx }) => (
  <>
    <Ellipse cx={cx} cy={22} rx={3.3} ry={4.2} fill="#FFFFFF" />
    <Ellipse cx={cx} cy={22} rx={3.3} ry={4.2} fill="none" stroke={INK} strokeWidth={0.6} />
    <Circle cx={cx} cy={22} r={1.9} fill={IRIS} />
    <Circle cx={cx} cy={22} r={1.3} fill="#0B0A10" />
    <Circle cx={cx - 0.6} cy={21.2} r={0.55} fill="#FFFFFF" />
  </>
);

// ── Expressions — eye + mouth combos, all in the one brand construction (the
//    one-face rule holds: these are moods of THE face, not new characters). ───

/** Cheerful (the default): the endearing gaze + open smile. */
export const BrandFace: React.FC<PartProps> = () => (
  <>
    <AvatarEye cx={16} irisDx={0.55} />
    <AvatarEye cx={32} irisDx={-0.55} />
    <OpenSmile />
  </>
);

/** Soft smile: the same gaze + closed tapered smile. */
export const SmileFace: React.FC<PartProps> = () => (
  <>
    <AvatarEye cx={16} irisDx={0.55} />
    <AvatarEye cx={32} irisDx={-0.55} />
    <TaperedSmile />
  </>
);

/** Joy: both eyes closed happy + open smile. */
export const JoyFace: React.FC<PartProps> = () => (
  <>
    <ClosedEye cx={16} />
    <ClosedEye cx={32} />
    <OpenSmile />
  </>
);

/** Wink: one open, one happy-closed + open smile. */
export const WinkFace: React.FC<PartProps> = () => (
  <>
    <AvatarEye cx={16} irisDx={0.55} />
    <ClosedEye cx={32} />
    <OpenSmile />
  </>
);

/** Wow: wide centered eyes + a round "o" mouth with tongue. */
export const WowFace: React.FC<PartProps> = () => (
  <>
    <WideEye cx={16} />
    <WideEye cx={32} />
    <Ellipse cx={24.675} cy={32.4} rx={2.7} ry={3.3} fill={INK} />
    <Ellipse cx={24.675} cy={33.6} rx={1.5} ry={1.5} fill="#E2707E" />
  </>
);

// ── Hair — TWO SUB-LAYERS (the layering system):
//    · a BACK drape drawn BEHIND the head — hangs at the sides/shoulders and
//      shows below a hat brim (long/waves only; short styles have none);
//    · a FRONT crown drawn ON the head — hugs the skull (outer x within ~5..44)
//      so a hat, drawn last and opaque, COVERS it. Nothing is ever clipped away
//      by the hat — it is genuinely occluded, and the drape flows out below.
//    Reddit encodes the same discipline as z-suffixes on its asset ids
//    (hair _70 under hat _80). Clip ids are per-style and per sub-layer.

/**
 * The crown mass with VISIBLE LAYERING: flat fill + tonal strand groups. `lights`
 * (a lighter shade) make the layering read on DARK hair; `darks` (a deeper shade)
 * make it read on LIGHT hair — so texture shows at every colour. NO white gloss
 * (that read as plastic). The silhouette hairline is clean (no stray tendrils).
 */
const HairVol: React.FC<{
  clip: string;
  sil: string;
  lights: string[];
  darks: string[];
  color: string;
}> = ({ clip, sil, lights, darks, color }) => (
  <>
    <ClipPath id={clip}>
      <Path d={sil} />
    </ClipPath>
    <Path d={sil} fill={color} />
    <G clipPath={`url(#${clip})`}>
      {darks.map((d, i) => (
        <Path key={`d${i}`} d={d} fill="none" stroke={shade(color, -0.42)} strokeWidth={1.5} strokeLinecap="round" opacity={0.5} />
      ))}
      {lights.map((d, i) => (
        <Path key={`l${i}`} d={d} fill="none" stroke={shade(color, 0.34)} strokeWidth={1.1} strokeLinecap="round" opacity={0.6} />
      ))}
    </G>
    <Path d={sil} fill="none" stroke={INK} strokeWidth={1.2} strokeLinejoin="round" />
  </>
);

/** The drape (two side panels joined behind the head): flat fill + the same
 *  layered-strand treatment flowing downward + ink outline. Drawn behind the
 *  head, so its top is hidden and it can never poke above a hat. */
const HairDrape: React.FC<{
  clip: string;
  sil: string;
  lights?: string[];
  darks?: string[];
  color: string;
}> = ({ clip, sil, lights = [], darks = [], color }) => (
  <>
    <ClipPath id={clip}>
      <Path d={sil} />
    </ClipPath>
    <Path d={sil} fill={color} />
    <G clipPath={`url(#${clip})`}>
      {darks.map((d, i) => (
        <Path key={`d${i}`} d={d} fill="none" stroke={shade(color, -0.4)} strokeWidth={1.4} strokeLinecap="round" opacity={0.45} />
      ))}
      {lights.map((d, i) => (
        <Path key={`l${i}`} d={d} fill="none" stroke={shade(color, 0.3)} strokeWidth={1} strokeLinecap="round" opacity={0.5} />
      ))}
    </G>
    <Path d={sil} fill="none" stroke={INK} strokeWidth={1.2} strokeLinejoin="round" />
  </>
);

/** MILITARY / buzz cut — head-hugging by construction (masked to the head),
 *  crisp high hairline. Flat against the skull is CORRECT for this style. No
 *  back drape; the crown IS the whole style. */
export const HairCrop: React.FC<PartProps> = ({ colors, layer }) =>
  layer === "back" ? null : (
    <>
      <Path
        d="M0 0 H48 V12.6 C42 11.4 36 12.8 30 13.2 C26 13.5 22 13.5 18 13.2 C12 12.8 6 11.4 0 12.6 Z"
        fill={colors.hair}
        mask="url(#av-head)"
      />
      <G mask="url(#av-head)">
        <Path d="M8 6.5 C18 3.5 30 3.5 40 6.5" fill="none" stroke={shade(colors.hair, 0.3)} strokeWidth={1} strokeLinecap="round" opacity={0.4} />
        <Path d="M10 9.5 C20 6.8 28 6.8 38 9.5" fill="none" stroke={shade(colors.hair, -0.4)} strokeWidth={1} strokeLinecap="round" opacity={0.4} />
      </G>
      <Path
        d="M0 12.6 C6 11.4 12 12.8 18 13.2 C22 13.5 26 13.5 30 13.2 C36 12.8 42 11.4 48 12.6"
        fill="none"
        stroke={INK}
        strokeWidth={1.1}
        mask="url(#av-head)"
      />
    </>
  );

/** Side-swept: crown volume above the head hugging the skull, long diagonal
 *  locks sweeping left→up-right. Crown-only (no drape) — a hat covers it. */
export const HairSwoop: React.FC<PartProps> = ({ colors, layer }) =>
  layer === "back" ? null : (
    <HairVol
      clip="avHairSwoopF"
      color={colors.hair}
      sil="M5.6 25.5 C4 11 11.5 1.6 24.675 1.8 C37.8 2 45.2 7.5 43.6 25.5 C43.2 27.9 40.7 27.9 40.3 25.5 C40 21.6 40.2 18.4 40.4 16 C33.6 12.8 26 15.4 20 15.8 C15 16.1 12 15.2 8.7 17.4 C8.6 20 8.5 22.8 8.3 25.5 C7.9 27.9 6 27.9 5.6 25.5 Z"
      lights={["M9.5 15.5 C18 10.5 30 9.5 41.5 13.5", "M11 19.5 C19 15 29 14.5 39.5 17.5", "M13 23 C20 19 28 18.5 35 21"]}
      darks={["M9 12 C19 6.5 32 6 42 11", "M10.5 17 C19 12.5 30 12 40 15.5", "M12.5 21 C20 17 29 16.5 37 19"]}
    />
  );

/** Curly: rounded bumpy crown hugging the skull, interior ink C-coils.
 *  Crown-only — a hat covers it, the side bumps peek below the brim. */
export const HairCurls: React.FC<PartProps> = ({ colors, layer }) => {
  const coils: [number, number, number, number][] = [
    [10, 12, 1.8, 10],
    [15.5, 9, 1.9, -20],
    [21, 7.5, 2, 15],
    [27, 7.5, 2, -10],
    [32.5, 9, 1.9, 25],
    [38, 12, 1.8, -15],
    [13, 15, 1.5, 35],
    [24, 13, 1.7, 0],
    [35, 15, 1.5, -35],
    [8.5, 18.5, 1.4, 20],
    [40, 18.5, 1.4, -20],
  ];
  const sil =
    "M6 22.5 C4 18 4.2 13.5 6.4 11.4 C5.4 7.4 9 4.2 12.6 5.8 C13.8 2.6 18.8 2.1 21.4 4.6 C23.4 2.1 27.6 2.1 29.6 4.6 C32.2 2.3 36.8 3.2 37.8 6.4 C41.4 5.7 44 8.9 42.8 12.1 C44.8 14.6 44.4 18.6 42.4 22.5 C41.8 24.9 39.2 24.9 38.6 22.5 C38.3 20.2 38.4 18 38.6 16.4 C32 13.6 28 15.6 24 15.2 C20 14.8 16 13.6 10.4 16.4 C10.6 18 10.7 20.2 10.4 22.5 C9.8 24.9 6.6 24.9 6 22.5 Z";
  if (layer === "back") return null;
  return (
    <>
      <ClipPath id="avHairCurlsF">
        <Path d={sil} />
      </ClipPath>
      <Path d={sil} fill={colors.hair} />
      <Path d={sil} fill="none" stroke={INK} strokeWidth={1.2} strokeLinejoin="round" />
      {/* the coils drawn twice — a deeper shade offset down (shadow) then a
          lighter shade (lit strand), so curls read on any hair colour. */}
      <G clipPath="url(#avHairCurlsF)">
        {coils.map(([cx, cy, r, rot], i) => (
          <Path
            key={`ds${i}`}
            d={`M${cx - r} ${cy + 0.5} A${r} ${r} 0 1 1 ${cx + r * 0.35} ${cy + 0.5 + r * 0.9}`}
            fill="none"
            stroke={shade(colors.hair, -0.42)}
            strokeWidth={1.1}
            strokeLinecap="round"
            transform={`rotate(${rot} ${cx} ${cy + 0.5})`}
          />
        ))}
        {coils.map(([cx, cy, r, rot], i) => (
          <Path
            key={`ls${i}`}
            d={`M${cx - r} ${cy} A${r} ${r} 0 1 1 ${cx + r * 0.35} ${cy + r * 0.9}`}
            fill="none"
            stroke={shade(colors.hair, 0.32)}
            strokeWidth={1.1}
            strokeLinecap="round"
            transform={`rotate(${rot} ${cx} ${cy})`}
          />
        ))}
      </G>
    </>
  );
};

/** Wavy medium: centre-parted crown on the head + a soft drape falling past the
 *  ears (behind the head). A hat covers the crown; the drape shows below.
 *  layer omitted (standalone preview) ⇒ both, drape then crown. */
export const HairWaves: React.FC<PartProps> = ({ colors, layer }) => {
  const back = (
    <HairDrape
      clip="avHairWavesB"
      color={colors.hair}
      sil="M6 15.8 C2.8 20 3.2 24.5 5.6 27 C3 29.4 2.8 33.4 4.8 37 C6.4 32.6 6.2 28.4 8.8 25.4 C6.4 23 6.8 19.2 8.6 17.2 C7.4 16.1 6 15.8 6 15.8 Z M43.35 15.8 C46.55 20 46.15 24.5 43.75 27 C46.35 29.4 46.55 33.4 44.55 37 C42.95 32.6 43.15 28.4 40.55 25.4 C42.95 23 42.55 19.2 40.75 17.2 C41.95 16.1 43.35 15.8 43.35 15.8 Z"
      lights={["M6.4 19 C4.6 23 4.8 28 6 32", "M43 19 C44.8 23 44.6 28 43.4 32"]}
      darks={["M7.4 18 C5.6 22 5.8 28 7 32.5", "M42 18 C43.8 22 43.6 28 42.4 32.5"]}
    />
  );
  const front = (
    <HairVol
      clip="avHairWavesF"
      color={colors.hair}
      sil="M5.8 20.5 C3.6 11.5 10.5 2.2 24.675 2.2 C38.85 2.2 45.75 11.5 43.55 20.5 C43.1 18.2 41.8 16.4 39.6 16 C33 13.7 28.5 15.8 24.5 15.4 C20 14.9 15.5 13.7 9.75 16 C7.55 16.4 6.25 18.2 5.8 20.5 Z"
      lights={["M8.5 8.8 C14 6 20 8 24.675 6.6 C29.3 8 35 6 40.5 8.8", "M9 13 C14.5 10.2 20 12.2 24.675 10.8 C29.3 12.2 35 10.2 40 13"]}
      darks={["M8.6 11 C14 8.2 20 10.2 24.675 8.8 C29.3 10.2 35 8.2 40.3 11", "M9.6 15.4 C15 12.6 20 14.4 24.675 13.2 C29.3 14.4 35 12.6 39.6 15.4"]}
    />
  );
  if (layer === "back") return back;
  if (layer === "front") return front;
  return (
    <>
      {back}
      {front}
    </>
  );
};

/** Long shoulder-length: crown on the head + a drape falling to the tile bottom
 *  behind the head (clipped by the circle = past the shoulders). A hat covers
 *  the crown; the drape frames the face below the brim.
 *  layer omitted (standalone preview) ⇒ both, drape then crown. */
export const HairLong: React.FC<PartProps> = ({ colors, layer }) => {
  const back = (
    <HairDrape
      clip="avHairLongB"
      color={colors.hair}
      sil="M6 15.5 C2.6 25 2.8 34 4.6 40.5 C5.9 45 9.3 47.6 13.4 46.6 C12 44.5 11 42 10.8 38 C10.4 30 10.8 24 12.4 18.5 C9.5 16.3 7.4 15.5 6 15.5 Z M43.35 15.5 C46.75 25 46.55 34 44.75 40.5 C43.45 45 40.05 47.6 35.95 46.6 C37.35 44.5 38.35 42 38.55 38 C38.95 30 38.55 24 36.95 18.5 C39.85 16.3 41.95 15.5 43.35 15.5 Z"
      lights={["M7.8 19 C6.4 27 6.6 36 8 44", "M11.2 20 C10.4 28 10.6 37 11.4 45", "M40.2 19 C41.6 27 41.4 36 40 44", "M36.8 20 C37.6 28 37.4 37 36.6 45"]}
      darks={["M9.4 18.5 C8 27 8.4 36 9.6 44.5", "M38.6 18.5 C40 27 39.6 36 38.4 44.5"]}
    />
  );
  const front = (
    <HairVol
      clip="avHairLongF"
      color={colors.hair}
      sil="M5.6 19 C3.4 9.5 10.5 1.8 24.675 1.8 C38.85 1.8 45.95 9.5 43.75 19 C43.2 16.4 41.6 15.5 39.4 15.5 C33 13.2 28.5 15.4 24.5 15 C20 14.5 15.5 13.2 9.95 15.5 C7.75 15.5 6.15 16.4 5.6 19 Z"
      lights={["M13 8 C13.6 11.5 13.2 14.5 12.8 17", "M19.5 6 C19.8 10 19.6 13.5 19.4 15.4", "M29.85 6 C29.55 10 29.75 13.5 29.95 15.4", "M36.35 8 C35.75 11.5 36.15 14.5 36.55 17"]}
      darks={["M24.675 3 C24.55 8 24.5 12 24.4 15.4", "M16.2 7 C16.6 11 16.4 14 16 16", "M33.15 7 C32.75 11 32.95 14 33.35 16"]}
    />
  );
  if (layer === "back") return back;
  if (layer === "front") return front;
  return (
    <>
      {back}
      {front}
    </>
  );
};

// ── Beard / facial hair ──────────────────────────────────────────────────────
//    THE JAWLINE MODEL (reference sheet): the full beard is MASKED TO THE HEAD,
//    so its outer edge IS the face's bottom/side silhouette — it can never
//    spill past the face. Only the top boundary (the CHEEK line) is drawn:
//    thin sideburns at the face edge sweeping down across the cheeks, staying
//    well below the eyes. Fill = the HAIR color; the mouth draws on top.

/** The cheek line: face edge (sideburns) → down across the cheeks → over the
 *  upper lip. Everything below it, inside the head mask, is beard. */
const BEARD_CHEEK =
  "M0 26 C6 23.4 9 25.6 14 27.2 C18 28.4 21 28.8 24.675 28.8 C28.35 28.8 31.35 28.4 35.35 27.2 C40.35 25.6 43.35 23.4 49.35 26";
const BEARD_FILL = `${BEARD_CHEEK} L49.35 48 L0 48 Z`;

/** flat fill + ink outline for a beard shape. */
const InkedBeard: React.FC<{ d: string; fill: string }> = ({ d, fill }) => (
  <>
    <Path d={d} fill={fill} />
    <Path d={d} fill="none" stroke={INK} strokeWidth={1.1} strokeLinejoin="round" />
  </>
);

/** Soft 5-o'clock shadow — the beard region at low opacity, no hard line. */
export const BeardStubble: React.FC<PartProps> = ({ colors }) => (
  <G mask="url(#av-head)">
    <Path d={BEARD_FILL} fill={colors.hair} opacity={0.3} />
  </G>
);

/** Lip strip. */
export const BeardMustache: React.FC<PartProps> = ({ colors }) => (
  <InkedBeard
    d="M16.8 27 C20 28.6 24.675 27.9 24.675 27.9 C24.675 27.9 29.35 28.6 32.55 27 C32 29.4 28 30.4 24.675 30.4 C21.35 30.4 17.35 29.4 16.8 27 Z"
    fill={colors.hair}
  />
);

/** Handlebar: the strip with curled ends (the classic twirl). */
export const BeardHandlebar: React.FC<PartProps> = ({ colors }) => (
  <>
    <InkedBeard
      d="M17.6 28.6 Q20.8 27 24.675 27.7 Q28.55 27 31.75 28.6 Q31 30.3 28 30.5 Q26 30.6 24.675 30 Q23.35 30.6 21.35 30.5 Q18.35 30.3 17.6 28.6 Z"
      fill={colors.hair}
    />
    <Path
      d="M17.8 28.9 Q15.6 29.3 15.2 27.7 Q14.9 26.3 16.3 26.1 M31.55 28.9 Q33.75 29.3 34.15 27.7 Q34.45 26.3 33.05 26.1"
      fill="none"
      stroke={colors.hair}
      strokeWidth={1.5}
      strokeLinecap="round"
    />
    <Path
      d="M17.8 28.9 Q15.6 29.3 15.2 27.7 Q14.9 26.3 16.3 26.1 M31.55 28.9 Q33.75 29.3 34.15 27.7 Q34.45 26.3 33.05 26.1"
      fill="none"
      stroke={INK}
      strokeWidth={0.6}
      strokeLinecap="round"
      opacity={0.65}
    />
  </>
);

/** Horseshoe: the strip + thick bars flowing down from the mouth corners. */
export const BeardHorseshoe: React.FC<PartProps> = ({ colors }) => (
  <InkedBeard
    d="M16.8 27.2 Q20.2 26 24.675 26.6 Q29.15 26 32.55 27.2 L32.3 36.2 Q32.25 37.9 30.6 37.9 Q29.05 37.9 29.05 36.3 L29.15 29.9 Q27 30.2 24.675 30.2 Q22.35 30.2 20.2 29.9 L20.3 36.3 Q20.3 37.9 18.75 37.9 Q17.1 37.9 17.05 36.2 L16.8 27.2 Z"
    fill={colors.hair}
  />
);

/** Walrus: big bushy droop over the upper lip, sagging at the corners. */
export const BeardWalrus: React.FC<PartProps> = ({ colors }) => (
  <>
    <InkedBeard
      d="M15.6 28.4 Q19.4 26.2 24.675 26.6 Q29.95 26.2 33.75 28.4 Q34.55 31 32.55 33.2 Q31.25 34.5 30.15 33 Q29.45 32 29.15 30.9 Q27 31.5 24.675 31.5 Q22.35 31.5 20.2 30.9 Q19.9 32 19.2 33 Q18.1 34.5 16.8 33.2 Q14.8 31 15.6 28.4 Z"
      fill={colors.hair}
    />
    <Path
      d="M20.8 27.6 Q20.5 29.4 20.6 30.6 M24.675 27.2 Q24.575 29.2 24.575 30.9 M28.55 27.6 Q28.85 29.4 28.75 30.6"
      fill="none"
      stroke={shade(colors.hair, -0.4)}
      strokeWidth={0.8}
      strokeLinecap="round"
      opacity={0.5}
    />
  </>
);

/** Mustache + rounded chin patch framing the mouth. */
export const BeardGoatee: React.FC<PartProps> = ({ colors }) => (
  <InkedBeard
    d="M17.4 27.2 C20.6 28.6 24.675 27.9 24.675 27.9 C24.675 27.9 28.75 28.6 31.95 27.2 C31.5 29 29.2 29.9 26.6 30.2 C27.4 31.7 28 33.2 28 34.8 C28 37.6 26.6 39.8 24.675 40.4 C22.75 39.8 21.35 37.6 21.35 34.8 C21.35 33.2 21.95 31.7 22.75 30.2 C20.15 29.9 17.85 29 17.4 27.2 Z"
    fill={colors.hair}
  />
);

/** Full beard: fills the lower face inside the head mask (so it lines up with
 *  the face's own edge), matte strand layering, and one ink line along the
 *  cheek boundary only — the face already owns the ink on its silhouette. */
export const BeardFull: React.FC<PartProps> = ({ colors }) => (
  <G mask="url(#av-head)">
    <Path d={BEARD_FILL} fill={colors.hair} />
    <Path
      d="M12 30 C12.4 36 12.2 41 12 45 M37.35 30 C36.95 36 37.15 41 37.35 45 M24.675 37.5 C24.575 41 24.575 44 24.475 46.5"
      fill="none"
      stroke={shade(colors.hair, -0.42)}
      strokeWidth={1.4}
      strokeLinecap="round"
      opacity={0.45}
    />
    <Path
      d="M17 30.5 C17.3 36 17.1 41 17 45.5 M32.35 30.5 C32.05 36 32.25 41 32.35 45.5"
      fill="none"
      stroke={shade(colors.hair, 0.3)}
      strokeWidth={1}
      strokeLinecap="round"
      opacity={0.5}
    />
    <Path d={BEARD_CHEEK} fill="none" stroke={INK} strokeWidth={1.1} strokeLinecap="round" />
  </G>
);

// ── Headgear ─────────────────────────────────────────────────────────────────
//    Every hat's dome/crown covers the WHOLE head-top (x ≈ 5.4→43.6 down to the
//    hatline ≈ y15) so the hair crown is COVERED, never cut. The distinctive
//    silhouette (pinch, crease, brim) lives ABOVE that hatline. Headphones are
//    the exception: a band OVER the crown + ear cups, resting on the hair.

export const Beanie: React.FC<PartProps> = () => (
  <>
    <Dome d="M5 18 Q5.2 6.8 7.8 5 Q15 2.4 24.675 2.4 Q34.6 2.4 41.6 5 Q44 6.8 44.2 18 Q24.675 14.4 5 18 Z" fill="#3A6EA5" />
    {/* knit ribs */}
    <Path
      d="M12.4 5 Q13.4 9.8 12.8 14.8 M18.5 3.2 Q19.3 8.6 18.9 15.6 M24.675 2.4 L24.675 16 M30.85 3.2 Q30.05 8.6 30.45 15.6 M36.95 5 Q35.95 9.8 36.55 14.8"
      fill="none"
      stroke="#2C5580"
      strokeWidth={0.8}
      opacity={0.6}
    />
    {/* folded band */}
    <Sheen d="M4.4 17.4 Q24.675 13.4 45 17.4 L45 21.6 Q24.675 17.6 4.4 21.6 Z" fill="#2C5580" />
    {/* pom */}
    <Circle cx={CX} cy={1.5} r={2.5} fill="#5B8CBF" />
    <Circle cx={23.9} cy={0.8} r={0.9} fill="#FFF" opacity={0.5} />
  </>
);

export const BallCap: React.FC<PartProps> = () => (
  <>
    <Dome d="M5.4 16.8 Q5.6 6.2 8.1 4.7 Q15.3 2 24.675 2 Q34.05 2 41.25 4.7 Q43.75 6.2 43.95 16.8 Q24.675 13.2 5.4 16.8 Z" fill="#C0504C" />
    {/* panel seams + button */}
    <Path d="M24.675 2 L24.675 14.8 M15.2 3.2 Q17.3 8.6 16.8 14.2 M34.15 3.2 Q32.05 8.6 32.55 14.2" fill="none" stroke="#A5433F" strokeWidth={0.7} opacity={0.7} />
    <Circle cx={CX} cy={2} r={1.1} fill="#A5433F" />
    {/* curved visor with a gloss line */}
    <Sheen d="M4.7 16.2 Q24.675 12.6 44.65 16.2 Q42.7 19.6 24.675 18.9 Q6.65 19.6 4.7 16.2 Z" fill="#A5433F" />
    <Path d="M9.3 16.7 Q24.675 14.7 40.05 16.7" fill="none" stroke="#D97B76" strokeWidth={0.8} strokeLinecap="round" opacity={0.6} />
  </>
);

/** A band OVER the crown + ear cups at the sides — worn on the hair, not
 *  covering it (so it declares no hatline; the hair crown shows around it). */
export const Headphones: React.FC<PartProps> = () => (
  <>
    <Path
      d="M7 19 C7 7 15 3 24.675 3 C34.35 3 42.35 7 42.35 19"
      fill="none"
      stroke="#A9F0D1"
      strokeWidth={3.6}
      strokeLinecap="round"
    />
    <Path d="M8.5 6 C14 3.4 24.675 3 24.675 3" fill="none" stroke="#CFF7E3" strokeWidth={1.4} strokeLinecap="round" opacity={0.7} />
    <Rect x={3.3} y={17.6} width={7.6} height={13} rx={3.8} fill="#A9F0D1" />
    <Rect x={37.15} y={17.6} width={7.6} height={13} rx={3.8} fill="#A9F0D1" />
    <Rect x={5} y={19.6} width={4.2} height={9} rx={2.1} fill="#3D9C7C" />
    <Rect x={38.85} y={19.6} width={4.2} height={9} rx={2.1} fill="#3D9C7C" />
  </>
);

/** Seeker's kit: the eager beginner's bucket hat. Dome covers the head-top. */
export const TouristHat: React.FC<PartProps> = () => (
  <>
    <Dome d="M5.4 15.6 Q5.6 6.2 8.2 4.8 Q15.6 2.4 24.675 2.4 Q33.75 2.4 41.15 4.8 Q43.75 6.2 43.95 15.6 Q24.675 12.2 5.4 15.6 Z" fill="#D9C79E" />
    <Path d="M5.6 15 Q24.675 11.6 43.75 15 L43.75 17.4 Q24.675 14 5.6 17.4 Z" fill="#B09A6A" />
    {/* floppy bucket brim, tilted down */}
    <Sheen d="M2.6 15.4 Q24.675 11.4 46.75 15.4 Q45.3 19.4 24.675 18.4 Q4.05 19.4 2.6 15.4 Z" fill="#C9B68A" />
    <Path d="M5.6 16.4 Q24.675 14.2 43.75 16.4" fill="none" stroke="#A8926A" strokeWidth={0.7} strokeLinecap="round" opacity={0.6} />
  </>
);

/** Pathfinder's kit: the safari bush hat — TALL rounded crown covering the whole
 *  head-top, leather band, wide stiff brim. The step up from the tourist bucket. */
export const ExplorerHat: React.FC<PartProps> = () => (
  <>
    <Dome d="M6 14 C5 5.5 9 2.2 24.675 2.2 C40.35 2.2 44.35 5.5 43.35 14 C36.5 12 29 12.8 24.675 12.8 C20.35 12.8 12.85 12 6 14 Z" fill="#A8935E" />
    {/* leather band + buckle */}
    <Path d="M11 10.8 C18 9.4 31.35 9.4 38.35 10.8 L38.35 13.6 C31 12.2 18 12.2 11 13.6 Z" fill="#55492E" />
    <Path d="M8 10.9 C15 9.6 34.35 9.6 41.35 10.9" fill="none" stroke="#8A7448" strokeWidth={0.7} strokeLinecap="round" opacity={0.5} />
    <Rect x={27.4} y={11} width={1.5} height={2.3} rx={0.35} fill="#C9A05A" />
    {/* wide stiff brim */}
    <Dome d="M3 15.8 C2.5 13 5.8 13.2 8.4 13.9 C15.5 15.1 24.675 15.3 24.675 15.3 C24.675 15.3 33.85 15.1 40.95 13.9 C43.55 13.2 46.85 13 46.35 15.8 C41.6 18.6 24.675 18.9 24.675 18.9 C7.75 18.6 3 15.8 3 15.8 Z" fill="#A8935E" />
    <Path d="M6.4 16.4 Q24.675 18 42.95 16.4" fill="none" stroke="#6E5E3A" strokeWidth={0.7} strokeLinecap="round" opacity={0.5} />
    <Path d="M10 3.4 C16 1.6 24.675 2 24.675 2" fill="none" stroke="#FFF" strokeWidth={1} strokeLinecap="round" opacity={0.16} />
  </>
);

/** North Star's kit: the cowboy hat — TALL cattleman-creased crown covering the
 *  head-top, dark band, upswept curled brim, gold 5-point star. */
export const CowboyHat: React.FC<PartProps> = () => (
  <>
    <Dome d="M5.8 13.8 C4.8 5.5 8.8 2.2 13.8 2.4 C16.4 3.4 18.4 3.6 20 2.8 C21.4 2.1 23.075 3.4 24.675 3.4 C26.275 3.4 27.95 2.1 29.35 2.8 C30.95 3.6 32.95 3.4 35.55 2.4 C40.55 2.2 44.55 5.5 43.55 13.8 C36.5 11.8 29 12.6 24.675 12.6 C20.35 12.6 12.85 11.8 5.8 13.8 Z" fill="#9A6B3F" />
    {/* cattleman crease + side dents */}
    <Path d="M24.675 3.4 L24.675 8" fill="none" stroke="#5E4128" strokeWidth={0.8} strokeLinecap="round" opacity={0.55} />
    <Path d="M19 3 Q18.6 5.5 19 8 M30.35 3 Q30.75 5.5 30.35 8" fill="none" stroke="#5E4128" strokeWidth={0.7} strokeLinecap="round" opacity={0.4} />
    {/* dark band */}
    <Path d="M6.8 10.8 C15 9.4 34.35 9.4 42.55 10.8 L42.55 13.4 C34 12 15 12 6.8 13.4 Z" fill="#4A3320" />
    {/* brim with upswept side curls */}
    <Dome d="M2.3 13 C1.5 10 4.3 9.6 5.3 10.8 C5.3 13.8 12 14.2 24.675 14.2 C37.35 14.2 44.05 13.8 44.05 10.8 C45.05 9.6 47.85 10 47.05 13 C44.4 18.2 24.675 18.6 24.675 18.6 C4.95 18.2 2.3 13 2.3 13 Z" fill="#9A6B3F" />
    <Path d="M6.8 15.6 C15 17 34.35 17 42.55 15.6" fill="none" stroke="#5E4128" strokeWidth={0.7} strokeLinecap="round" opacity={0.5} />
    <Star5 x={CX} y={6.8} s={2.9} fill={GOLD} />
    <Path d="M15 2.8 Q19.6 1.4 22.2 2.2" fill="none" stroke="#FFF" strokeWidth={0.9} strokeLinecap="round" opacity={0.16} />
  </>
);

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

/** Teal wayfarers: thick top bar, trapezoid dark lenses, glints. */
export const Wayfarers: React.FC<PartProps> = () => (
  <>
    <Path d="M10.4 18.2 H21.6 Q22.3 18.2 22.1 19.5 L21.3 25.3 Q21.1 26.7 19.7 26.7 H12.7 Q11.3 26.7 11.1 25.3 L10 19.5 Q9.8 18.2 10.4 18.2 Z" fill="#23202B" />
    <Path d="M27.75 18.2 H38.95 Q39.55 18.2 39.35 19.5 L38.25 25.3 Q38.05 26.7 36.65 26.7 H29.65 Q28.25 26.7 28.05 25.3 L27.25 19.5 Q27.05 18.2 27.75 18.2 Z" fill="#23202B" />
    <Path d="M10.4 18.2 H21.6 Q22.3 18.2 22.1 19.5 L21.3 25.3 Q21.1 26.7 19.7 26.7 H12.7 Q11.3 26.7 11.1 25.3 L10 19.5 Q9.8 18.2 10.4 18.2 Z" fill="none" stroke="#3AA6A0" strokeWidth={1.5} />
    <Path d="M27.75 18.2 H38.95 Q39.55 18.2 39.35 19.5 L38.25 25.3 Q38.05 26.7 36.65 26.7 H29.65 Q28.25 26.7 28.05 25.3 L27.25 19.5 Q27.05 18.2 27.75 18.2 Z" fill="none" stroke="#3AA6A0" strokeWidth={1.5} />
    <Path d="M22.1 19.3 H27.25 M9.9 19.3 L6.2 18.4 M39.45 19.3 L43.15 18.4" fill="none" stroke="#3AA6A0" strokeWidth={1.6} strokeLinecap="round" />
    <Path d="M12.6 20.4 L15 19.8 M29.9 20.4 L32.3 19.8" fill="none" stroke="#FFF" strokeWidth={0.9} strokeLinecap="round" opacity={0.6} />
  </>
);

/** Pink round shades: dark lenses in a warm pink frame. */
export const RoundShades: React.FC<PartProps> = () => (
  <>
    <Circle cx={16} cy={22} r={5.4} fill="#23202B" />
    <Circle cx={32} cy={22} r={5.4} fill="#23202B" />
    <Circle cx={16} cy={22} r={5.4} fill="none" stroke="#E86FA4" strokeWidth={1.6} />
    <Circle cx={32} cy={22} r={5.4} fill="none" stroke="#E86FA4" strokeWidth={1.6} />
    <Path d="M21.4 20.6 Q24.675 18.8 27.95 20.6" fill="none" stroke="#E86FA4" strokeWidth={1.5} />
    <Path d="M10.6 21 L6.7 19.6 M37.4 21 L41.3 19.6" stroke="#E86FA4" strokeWidth={1.5} strokeLinecap="round" />
    <Path d="M13 19.6 Q14.4 18.4 16.4 18.6 M29 19.6 Q30.4 18.4 32.4 18.6" fill="none" stroke="#FFF" strokeWidth={0.9} strokeLinecap="round" opacity={0.6} />
  </>
);

/** Lime-tinted rounds in a navy frame — see-through tint, the eyes show. */
export const LimeRounds: React.FC<PartProps> = () => (
  <>
    <Circle cx={16} cy={22} r={5.2} fill="#B7D34A" opacity={0.45} />
    <Circle cx={32} cy={22} r={5.2} fill="#B7D34A" opacity={0.45} />
    <Circle cx={16} cy={22} r={5.2} fill="none" stroke="#2E3A55" strokeWidth={1.5} />
    <Circle cx={32} cy={22} r={5.2} fill="none" stroke="#2E3A55" strokeWidth={1.5} />
    <Path d="M21.2 22 H26.8" stroke="#2E3A55" strokeWidth={1.5} />
    <Path d="M10.8 21 L6.9 19.6 M37.2 21 L41.1 19.6" stroke="#2E3A55" strokeWidth={1.5} strokeLinecap="round" />
    <Path d="M13.2 19.4 L15.8 18.8 M29.2 19.4 L31.8 18.8" fill="none" stroke="#FFF" strokeWidth={0.8} strokeLinecap="round" opacity={0.55} />
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
    <Star5 x={48.6} y={12.4} s={1.7} fill={GOLD} />
  </>
);

// ── NEW headgear (compact, tile-fitting) ─────────────────────────────────────

/** A party hat — a crisp pointed cone whose lower sides FLARE outward to hug the
 *  head corners (full coverage, so no head/hair peeks out beside it), wrapped in
 *  even gold stripes with a white pom at the tip. Free (celebration dressing). */
export const PartyHat: React.FC<PartProps> = () => (
  <>
    <Dome
      d="M5 16 C3.6 10 6.5 4.5 24.675 0.9 C42.85 4.5 45.75 10 44.35 16 C34 14.1 15 14.1 5 16 Z"
      fill="#8B6CFF"
    />
    {/* even diagonal wrap stripes */}
    <Path
      d="M8.8 13 L13.6 6.4 M15.2 13.6 L21 4.4 M22.4 13.8 L27.4 3.6 M30 13.6 L34 6.8 M36.6 12.8 L39.6 8"
      fill="none"
      stroke="#FFD23F"
      strokeWidth={2.1}
      strokeLinecap="round"
    />
    {/* pom at the tip */}
    <Circle cx={CX} cy={0.9} r={2.2} fill="#FFFFFF" />
    <Circle cx={CX} cy={0.9} r={2.2} fill="none" stroke={INK} strokeWidth={0.9} />
  </>
);

/** A gold crown — a solid gold body that FULLY covers the head, five points
 *  rising into rounded ball tips, over a darker-gold inner rim that fills the
 *  valleys (so no head shows between the points). A jewelled band carries a
 *  centre diamond and two side gems. */
export const Crown: React.FC<PartProps> = () => (
  <>
    {/* darker inner rim behind the points — covers the head in the valleys */}
    <Path d="M6 15.5 C5.4 8 9.6 5 24.675 5 C39.75 5 43.95 8 43.35 15.5 C36 13.5 29 14 24.675 14 C20.35 14 13 13.5 6 15.5 Z" fill="#E0A93A" />
    {/* bright pointed body */}
    <Dome
      d="M5.8 16 C5.2 12 5.2 9 6 7.2 L8 4.6 C9.5 8 10.8 9.6 12.2 9.7 C13.6 9.6 15 6 16.3 3.4 C18 6.4 19.4 9.7 20.75 9.8 C22.1 9.7 23.4 3.8 24.675 1.6 C25.95 3.8 27.25 9.7 28.6 9.8 C29.95 9.7 31.4 6.4 33.05 3.4 C34.35 6 35.55 9.6 37.15 9.7 C38.55 9.6 39.7 7.6 41.35 4.6 L43.35 7.2 C44.15 9 44.15 12 43.55 16 C34.5 14 15 14 5.8 16 Z"
      fill={GOLD}
    />
    {/* band ridges */}
    <Path d="M6.5 12 C15 10.7 34.35 10.7 42.85 12 M6.6 14.2 C15 12.9 34.35 12.9 42.75 14.2" fill="none" stroke="#D9982E" strokeWidth={0.9} strokeLinecap="round" />
    {/* ball tips */}
    <CrownBall x={8} y={4.2} r={2} />
    <CrownBall x={16.3} y={3} r={2.1} />
    <CrownBall x={CX} y={1.2} r={2.3} />
    <CrownBall x={33.05} y={3} r={2.1} />
    <CrownBall x={41.35} y={4.2} r={2} />
    {/* centre diamond + side gems */}
    <Path d="M24.675 9.4 L27 12.4 L24.675 15.4 L22.35 12.4 Z" fill="#E23B4E" />
    <Path d="M24.675 9.4 L27 12.4 L24.675 15.4 L22.35 12.4 Z" fill="none" stroke="#9E2233" strokeWidth={0.5} strokeLinejoin="round" />
    <Circle cx={23.9} cy={11.4} r={0.7} fill="#FF8A97" opacity={0.7} />
    <Ellipse cx={13.4} cy={12.9} rx={1.5} ry={2} fill="#E23B4E" />
    <Ellipse cx={35.95} cy={12.9} rx={1.5} ry={2} fill="#E23B4E" />
  </>
);

/** A top hat — a full-head-covering dark crown (flat-topped) on a wide brim. */
export const TopHat: React.FC<PartProps> = () => (
  <>
    <Dome d="M8 13.5 C7.2 4.5 10.5 2.5 24.675 2.5 C38.85 2.5 42.15 4.5 41.35 13.5 C34.5 11.8 29 12.4 24.675 12.4 C20.35 12.4 14.5 11.8 8 13.5 Z" fill="#2B2733" />
    {/* red band */}
    <Path d="M8.6 10.4 C15 9 34.35 9 40.75 10.4 L40.75 13 C34.35 11.6 15 11.6 8.6 13 Z" fill="#C0504C" />
    {/* wide stiff brim */}
    <Dome d="M3 14 C2.3 11.2 5.6 11.4 8.2 12.1 C15.5 13.5 24.675 13.7 24.675 13.7 C24.675 13.7 33.85 13.5 41.15 12.1 C43.75 11.4 47.05 11.2 46.35 14 C41.6 17 24.675 17.3 24.675 17.3 C7.75 17 3 14 3 14 Z" fill="#2B2733" />
    <Path d="M12 4.6 C16 3.1 24.675 2.9 24.675 2.9" fill="none" stroke="#FFF" strokeWidth={0.9} strokeLinecap="round" opacity={0.14} />
  </>
);

/** A pirate's bicorne — a black crown covering the head under a wide brim swept
 *  up into two corners, a gold edge trim, and a bone-white skull & crossbones on
 *  the front. */
export const PirateHat: React.FC<PartProps> = () => (
  <>
    <Dome d="M6 14 C5 5.8 9 2.6 24.675 2.6 C40.35 2.6 44.35 5.8 43.35 14 C36 12 29 12.6 24.675 12.6 C20.35 12.6 13 12 6 14 Z" fill="#26222B" />
    {/* wide brim swept up into two corners */}
    <Dome d="M1.8 15.5 C0.6 6.5 2.2 1.8 5.6 2.2 C7.6 4.4 8 8.2 9.2 10.4 C13.4 11.6 18.6 12 24.675 12 C30.75 12 35.95 11.6 40.15 10.4 C41.35 8.2 41.75 4.4 43.75 2.2 C47.15 1.8 48.75 6.5 47.55 15.5 C34 17.9 15 17.9 1.8 15.5 Z" fill="#26222B" />
    {/* gold edge trim */}
    <Path d="M3.2 13.6 C2.2 6.8 3.6 3.6 5.9 3.9 C7.7 5.9 8.2 9 9.5 11 C13.7 12.3 18.8 12.7 24.675 12.7 C30.55 12.7 35.65 12.3 39.85 11 C41.15 9 41.65 5.9 43.45 3.9 C45.75 3.6 47.15 6.8 46.15 13.6" fill="none" stroke={GOLD} strokeWidth={0.9} strokeLinecap="round" />
    {/* crossed bones */}
    <G stroke="#EDE6D8" strokeWidth={1.6} strokeLinecap="round">
      <Path d="M20 10.4 L29.35 6.3 M29.35 10.4 L20 6.3" />
    </G>
    <G fill="#EDE6D8">
      <Circle cx={19.6} cy={10.7} r={1.05} />
      <Circle cx={20.2} cy={9.9} r={1.05} />
      <Circle cx={29.75} cy={6} r={1.05} />
      <Circle cx={29.15} cy={6.8} r={1.05} />
      <Circle cx={29.75} cy={10.7} r={1.05} />
      <Circle cx={29.15} cy={9.9} r={1.05} />
      <Circle cx={19.6} cy={6} r={1.05} />
      <Circle cx={20.2} cy={6.8} r={1.05} />
    </G>
    {/* skull */}
    <Circle cx={CX} cy={8.2} r={3} fill="#EDE6D8" />
    <Path d="M22.4 10.4 h4.55 v1.25 q0 1.15 -2.275 1.15 q-2.275 0 -2.275 -1.15 Z" fill="#EDE6D8" />
    <Circle cx={23.25} cy={7.9} r={0.9} fill={INK} />
    <Circle cx={26.1} cy={7.9} r={0.9} fill={INK} />
    <Path d="M24.675 9.1 l-0.75 1.2 h1.5 Z" fill={INK} />
  </>
);

// ── NEW eyewear (at the eyes, cx 16/32 cy 22) ────────────────────────────────

const HEART_LENS =
  "M0 5 C-4 2 -5 -0.6 -5 -2.6 C-5 -4.6 -3 -5.2 -1.5 -3.5 C-0.7 -2.6 -0.3 -2.1 0 -1.6 C0.3 -2.1 0.7 -2.6 1.5 -3.5 C3 -5.2 5 -4.6 5 -2.6 C5 -0.6 4 2 0 5 Z";

/** Heart fun-glasses — rose heart lenses, an ink frame. Free (celebration). */
export const HeartGlasses: React.FC<PartProps> = () => (
  <>
    <Path d="M10.8 21 L6.9 19.6 M37.2 21 L41.1 19.6" stroke={INK} strokeWidth={1.5} strokeLinecap="round" />
    <Path d="M21 20.6 Q24.675 22.4 28.35 20.6" fill="none" stroke={INK} strokeWidth={1.5} strokeLinecap="round" />
    {[16, 32].map((cx) => (
      <G key={cx} transform={`translate(${cx} 22)`}>
        <Path d={HEART_LENS} fill="#FF6B9D" fillOpacity={0.92} />
        <Path d={HEART_LENS} fill="none" stroke={INK} strokeWidth={1.2} />
        <Ellipse cx={-1.8} cy={-2} rx={1.4} ry={0.9} fill="#FFFFFF" opacity={0.8} />
      </G>
    ))}
  </>
);

/** Star fun-shades — gold five-point star lenses. */
export const StarGlasses: React.FC<PartProps> = () => (
  <>
    <Path d="M10.4 21 L6.5 19.6 M37.6 21 L41.5 19.6" stroke={INK} strokeWidth={1.5} strokeLinecap="round" />
    <Path d="M21.4 21.4 H27.95" stroke={INK} strokeWidth={1.5} strokeLinecap="round" />
    <Star5 x={16} y={22} s={6} fill="#FFD23F" />
    <Star5 x={32} y={22} s={6} fill="#FFD23F" />
    <Circle cx={16} cy={21.4} r={1} fill="#FFFFFF" opacity={0.75} />
    <Circle cx={32} cy={21.4} r={1} fill="#FFFFFF" opacity={0.75} />
  </>
);

/** Cat-eye glasses — upswept outer corners in a warm frame. */
export const CatEye: React.FC<PartProps> = () => {
  const L = "M10 23.4 Q9.6 18.8 15.4 18.4 Q21 18.1 22.4 20.4 Q23 21.6 20.4 22.6 Q14.4 24.4 10 23.4 Z";
  const R = "M39.35 23.4 Q39.75 18.8 33.95 18.4 Q28.35 18.1 26.95 20.4 Q26.35 21.6 28.95 22.6 Q34.95 24.4 39.35 23.4 Z";
  return (
    <>
      <Path d={L} fill="#20222B" />
      <Path d={R} fill="#20222B" />
      <Path d={L} fill="none" stroke="#E86FA4" strokeWidth={1.6} strokeLinejoin="round" />
      <Path d={R} fill="none" stroke="#E86FA4" strokeWidth={1.6} strokeLinejoin="round" />
      <Path d="M22.4 20.6 Q24.675 19.4 26.95 20.6" fill="none" stroke="#E86FA4" strokeWidth={1.5} />
      <Path d="M9.9 20.6 L6 19.4 M39.45 20.6 L43.35 19.4" stroke="#E86FA4" strokeWidth={1.5} strokeLinecap="round" />
      <Path d="M13.4 20 L16.4 19.2 M29.4 19.2 L32.4 20" stroke="#FFF" strokeWidth={0.8} strokeLinecap="round" opacity={0.5} />
    </>
  );
};

// ── Collar category — collars that WRAP the neck ─────────────────────────────
//
// There is no drawn neck/torso: the head fills the tile below y≈40, so a thin
// band would just float over the chin. To read as clothing that goes AROUND the
// neck, each collar has THREE moves:
//   · a BACK wrap (COLLAR_BACK_WRAP) drawn behind the head that peeks in the
//     thin slivers beside the jaw (x≈2-6 / 43-46) — the "continues round the
//     back" cue;
//   · a FRONT garment body whose neckline CLIMBS the sides (over the outer jaw,
//     clear of the face features) and dips at centre — fabric hugging up the
//     neck. Standing collars use COLLAR_BAND_BODY (high), flat collars
//     COLLAR_SHOULDERS (lower), V-neck collars an inline V body;
//   · the collar DETAIL (rim, flaps, points, lapels, trim, knot) on top.
// Everything is masked to the tile circle by UserAvatar, so the shapes run past
// the tile edge (x −2..52, y→55) and clip to the neckline arc. Every collar
// recolors from ONE fabric colour `colors.collar`; secondary tones derive via
// shade(), so all six palette colours read — only GOLD (mandarin) + INK fixed.

/** Neckline that climbs high on the sides (standing collars sit in it). */
const COLLAR_BAND_BODY =
  "M-2 55 L-2 39.2 Q4 35.6 9.6 37 Q15.4 40 24.675 42.2 Q33.95 40 40.35 37 Q45.95 35.6 51.95 39.2 L51.95 55 Z";
/** A lower scooped neckline (flat collars lie on it). */
const COLLAR_SHOULDERS =
  "M-2 55 L-2 40.6 Q4 37.4 9.4 38.6 Q15 41.4 24.675 44.8 Q34.35 41.4 39.95 38.6 Q45.35 37.4 51.35 40.6 L51.35 55 Z";
/** The band that rises behind the head and peeks beside the jaw. */
const COLLAR_BACK_WRAP =
  "M0.6 47 Q0.4 35.2 24.675 34.2 Q48.95 35.2 48.75 47 L48.75 49 Q24.675 38 0.6 49 Z";

/** Turtleneck / cowl — a tall tube the neck rises into, with a rolled rim. */
export const Cowl: React.FC<PartProps> = ({ colors, layer }) => {
  const c = colors.collar;
  const rib = shade(c, -0.2);
  const roll = shade(c, 0.15);
  return (
    <>
      {layer !== "front" && <Dome d={COLLAR_BACK_WRAP} fill={shade(c, -0.24)} />}
      {layer !== "back" && (
        <>
          <Dome
            d="M-2 55 L-2 38 Q4 34.4 9.6 35.8 Q15.4 38.8 24.675 40.2 Q33.95 38.8 40.35 35.8 Q45.95 34.4 51.95 38 L51.95 55 Z"
            fill={c}
          />
          <Path d="M8 37.6 Q24.675 42.6 41.35 37.6" fill="none" stroke={roll} strokeWidth={1.3} strokeLinecap="round" opacity={0.85} />
          <Path d="M7.4 40.8 Q24.675 45.8 41.95 40.8" fill="none" stroke={rib} strokeWidth={1.2} strokeLinecap="round" opacity={0.55} />
        </>
      )}
    </>
  );
};

/** Knit scarf — a chunky band wrapped around the neck, knot + tails in front. */
export const Scarf: React.FC<PartProps> = ({ colors, layer }) => {
  const c = colors.collar;
  const rib = shade(c, -0.22);
  const knot = shade(c, -0.1);
  const tail = shade(c, -0.06);
  return (
    <>
      {layer !== "front" && <Dome d={COLLAR_BACK_WRAP} fill={shade(c, -0.24)} />}
      {layer !== "back" && (
        <>
          <Dome d={COLLAR_BAND_BODY} fill={c} />
          <Path d="M7 40.4 Q11 38.8 15.4 39.6 M33.95 39.6 Q38.35 38.8 42.35 40.4" fill="none" stroke={rib} strokeWidth={0.85} strokeLinecap="round" opacity={0.65} />
          <Path d="M8.4 43.6 Q24.675 48.2 40.95 43.6" fill="none" stroke={rib} strokeWidth={0.9} strokeLinecap="round" opacity={0.55} />
          <Dome d="M20.2 45.4 L29.15 45.4 L27.5 52.6 L21.85 52.6 Z" fill={tail} />
          <Rect x={21.2} y={43} width={7} height={4.6} rx={1.6} fill={knot} />
          <Rect x={21.2} y={43} width={7} height={4.6} rx={1.6} fill="none" stroke={INK} strokeWidth={0.9} />
        </>
      )}
    </>
  );
};

/** Bow tie — an open shirt collar (a V) wrapping the neck + a bow at the throat. */
export const Bowtie: React.FC<PartProps> = ({ colors, layer }) => {
  const c = colors.collar;
  const shirt = shade(c, 0.05);
  const point = shade(c, -0.06);
  const knot = shade(c, -0.32);
  return (
    <>
      {layer !== "front" && <Dome d={COLLAR_BACK_WRAP} fill={shade(c, -0.2)} />}
      {layer !== "back" && (
        <>
          <Dome
            d="M-2 55 L-2 39.6 Q4 36.2 9.6 37.6 L24.675 47.4 L39.75 37.6 Q45.35 36.2 51.35 39.6 L51.35 55 Z"
            fill={shirt}
          />
          <Dome d="M9.6 37.6 L24.675 47.4 L20.4 41 Q14.4 38.2 9.6 37.6 Z" fill={point} />
          <Dome d="M39.75 37.6 L24.675 47.4 L28.95 41 Q34.95 38.2 39.75 37.6 Z" fill={point} />
          <Dome d="M24.675 45.2 L18 42.2 L18 48.2 Z" fill={c} />
          <Dome d="M24.675 45.2 L31.35 42.2 L31.35 48.2 Z" fill={c} />
          <Rect x={22.95} y={43} width={3.45} height={4.4} rx={1.1} fill={knot} />
        </>
      )}
    </>
  );
};

/** Peter Pan — flat rounded twin flaps lying on the shoulders around the neck. */
export const PeterPanCollar: React.FC<PartProps> = ({ colors, layer }) => {
  const c = colors.collar;
  const dk = shade(c, -0.16);
  const flap = shade(c, 0.05);
  return (
    <>
      {layer !== "front" && <Dome d={COLLAR_BACK_WRAP} fill={dk} />}
      {layer !== "back" && (
        <>
          <Dome d={COLLAR_SHOULDERS} fill={c} />
          <Dome d="M24.675 43 Q14.6 41.8 9.4 44.6 Q6.6 46.8 8.2 49.4 Q14.6 51 20 48 Q22.8 46 24.675 45.2 Z" fill={flap} />
          <Dome d="M24.675 43 Q34.75 41.8 39.95 44.6 Q42.75 46.8 41.15 49.4 Q34.75 51 29.35 48 Q26.55 46 24.675 45.2 Z" fill={flap} />
          <Circle cx={24.675} cy={45} r={1} fill={dk} stroke={INK} strokeWidth={0.4} />
        </>
      )}
    </>
  );
};

/** Mandarin — a standing band all the way around the neck, gold trim + studs. */
export const MandarinCollar: React.FC<PartProps> = ({ colors, layer }) => {
  const c = colors.collar;
  return (
    <>
      {layer !== "front" && <Dome d={COLLAR_BACK_WRAP} fill={shade(c, -0.22)} />}
      {layer !== "back" && (
        <>
          <Dome d={COLLAR_BAND_BODY} fill={c} />
          <Path d="M8.4 38.8 Q24.675 43.6 40.95 38.8" fill="none" stroke={GOLD} strokeWidth={1} strokeLinecap="round" />
          <Path d="M24.675 42.4 L24.675 47.4" fill="none" stroke={INK} strokeWidth={0.9} />
          <Circle cx={24.675} cy={43.8} r={0.85} fill={GOLD} />
          <Circle cx={24.675} cy={45.8} r={0.85} fill={GOLD} />
        </>
      )}
    </>
  );
};

/** Sailor — a square collar wrapping to the back, striped V + neckerchief tie. */
export const SailorCollar: React.FC<PartProps> = ({ colors, layer }) => {
  const c = colors.collar;
  const trim = shade(c, 0.5);
  const knot = shade(c, -0.16);
  return (
    <>
      {layer !== "front" && <Dome d={COLLAR_BACK_WRAP} fill={c} />}
      {layer !== "back" && (
        <>
          <Dome
            d="M-2 55 L-2 39 Q4 35.6 9.6 37 L24.675 49 L39.75 37 Q45.35 35.6 51.35 39 L51.35 55 Z"
            fill={c}
          />
          <Path d="M10 38.4 L24.675 47 L39.35 38.4" fill="none" stroke={trim} strokeWidth={1} strokeLinecap="round" />
          <Path d="M11 40.2 L24.675 48.6 L38.35 40.2" fill="none" stroke={trim} strokeWidth={1} strokeLinecap="round" />
          <Rect x={22.7} y={45.6} width={3.95} height={2} rx={0.5} fill={knot} stroke={INK} strokeWidth={0.4} />
          <Dome d="M22.7 47.4 L26.65 47.4 L24.675 52 Z" fill={knot} />
        </>
      )}
    </>
  );
};

/** Wing tip — a formal upright band around the neck with two folded-down points. */
export const WingCollar: React.FC<PartProps> = ({ colors, layer }) => {
  const c = colors.collar;
  const tip = shade(c, -0.14);
  const roll = shade(c, 0.22);
  return (
    <>
      {layer !== "front" && <Dome d={COLLAR_BACK_WRAP} fill={shade(c, -0.2)} />}
      {layer !== "back" && (
        <>
          <Dome d={COLLAR_BAND_BODY} fill={c} />
          <Path d="M8.6 38.6 Q24.675 43.4 40.75 38.6" fill="none" stroke={roll} strokeWidth={0.8} strokeLinecap="round" opacity={0.85} />
          <Dome d="M22.1 41.8 L24.2 42.3 L23.4 45.8 Z" fill={tip} />
          <Dome d="M27.25 41.8 L25.15 42.3 L25.95 45.8 Z" fill={tip} />
        </>
      )}
    </>
  );
};

/** Shawl — rolled tuxedo lapels sweeping up both sides of the neck to a V. */
export const ShawlCollar: React.FC<PartProps> = ({ colors, layer }) => {
  const c = colors.collar;
  const roll = shade(c, 0.16);
  const deep = shade(c, -0.18);
  const sheen = shade(c, 0.34);
  return (
    <>
      {layer !== "front" && <Dome d={COLLAR_BACK_WRAP} fill={deep} />}
      {layer !== "back" && (
        <>
          <Dome
            d="M-2 55 L-2 39.6 Q4 36 9.6 37.6 L24.675 50 L39.75 37.6 Q45.35 36 51.35 39.6 L51.35 55 Z"
            fill={deep}
          />
          <Dome d="M9.6 37.6 L24.675 50 Q19.6 46.6 16.4 42.8 Q13.4 39.2 9.6 37.6 Z" fill={roll} />
          <Dome d="M39.75 37.6 L24.675 50 Q29.75 46.6 32.95 42.8 Q35.95 39.2 39.75 37.6 Z" fill={roll} />
          <Path d="M12 38.8 Q15.4 41.2 20.4 47" fill="none" stroke={sheen} strokeWidth={0.7} strokeLinecap="round" opacity={0.7} />
          <Path d="M37.35 38.8 Q33.95 41.2 28.95 47" fill="none" stroke={sheen} strokeWidth={0.7} strokeLinecap="round" opacity={0.7} />
        </>
      )}
    </>
  );
};

// ── Collars drawn as real garments ───────────────────────────────────────────
//
// The collars above are a fabric band plus marks on top. These are built the
// way a tailoring reference draws one, from four SEPARATE inked pieces:
//
//   1. GARMENT — the blouse underneath. Its shoulder line shows outside the
//      collar and its body fills below, so the collar sits ON something.
//   2. STAND   — the band around the neck. Its top edge stays VISIBLE above the
//      leaves the whole way across; that strip is the main reason a drawn
//      collar reads as a collar rather than as a shape.
//   3. LEAVES  — the fold-down parts: closed shapes with their own fold edge,
//      so the eye sees two pieces of cloth, not one silhouette.
//   4. DETAIL  — placket, buttons, trim, and a shadow under the fold (the cue
//      that puts cloth above cloth).
//
// SCALE is the other half of it. A real collar FRAMES the neck, so the stand
// runs up beside the jaw to y≈31 — into the background slivers either side of
// the head, which is the only part of the tile with room to show structure.
// Every piece clears the mouth (x 19–30, down to y 35.7) at every x.

/** The blouse under the collar, cut low enough for the stand to clear it. */
const GARMENT =
  "M-2 56 L-2 40.6 Q1.6 36.4 5.4 35.6 Q13.6 41 24.675 43 Q35.75 41 43.95 35.6 Q47.75 36.4 51.35 40.6 L51.35 56 Z";
/** The collar stand — the band around the neck; its top edge is what shows. */
const STAND =
  "M5.4 31.6 Q13.6 36.4 24.675 38.4 Q35.75 36.4 43.95 31.6 L44.55 35.6 Q35.95 40.6 24.675 42.6 Q13.4 40.6 4.8 35.6 Z";
/** The stand carrying on round the BACK of the neck — the "it goes all the way
 *  around" cue, seen in the slivers beside the jaw. */
const COLLAR_BACK =
  "M2 47 Q0.8 31.4 24.675 30.4 Q48.55 31.4 47.35 47 L47.35 48.8 Q24.675 36.4 2 48.8 Z";
/** Long-point leaves, hinged along the stand's lower edge. */
const LEAF_L = "M5 34.4 Q13.4 39.4 24.675 41.4 L17.4 46.6 Q9.6 43.6 3.8 37.4 Z";
const LEAF_R = "M44.35 34.4 Q35.95 39.4 24.675 41.4 L31.95 46.6 Q39.75 43.6 45.55 37.4 Z";
/** The band that finishes a frill ring at the neck. */
const FRILL_BAND =
  "M6 31.8 Q13.6 37 24.675 39.2 Q35.75 37 43.35 31.8 L43.75 34.8 Q35.95 40.2 24.675 42.4 Q13.4 40.2 5.6 34.8 Z";

/** A collar piece: flat fill + the shared ink edge at a chosen line weight — a
 *  frill pleat needs a finer edge than a collar leaf. */
const Piece: React.FC<{ d: string; fill: string; w?: number }> = ({ d, fill, w = 1.1 }) => (
  <>
    <Path d={d} fill={fill} />
    <Path d={d} fill="none" stroke={INK} strokeWidth={w} strokeLinejoin="round" />
  </>
);

/** Garment + stand + the shadow the stand casts on it. */
const CollarBase: React.FC<{ c: string }> = ({ c }) => (
  <>
    <Dome d={GARMENT} fill={c} />
    <Path
      d="M1.4 38.6 Q7.4 35.6 11.4 37.4 M47.95 38.6 Q41.95 35.6 37.95 37.4"
      fill="none"
      stroke={shade(c, -0.22)}
      strokeWidth={0.7}
      strokeLinecap="round"
      opacity={0.5}
    />
    <Dome d={STAND} fill={shade(c, -0.18)} />
  </>
);

/** The shadow a pair of leaves casts along its fold. */
const FoldShade: React.FC<{ c: string }> = ({ c }) => (
  <Path
    d="M6.2 35.8 Q13.8 40.4 24.2 42.4 M43.15 35.8 Q35.55 40.4 25.15 42.4"
    fill="none"
    stroke={shade(c, -0.2)}
    strokeWidth={0.6}
    strokeLinecap="round"
    opacity={0.5}
  />
);

/** A point on an ellipse around the neck: 180° = left of the neck, 90° =
 *  straight down the front, 0° = right of the neck. */
const ell = (deg: number, rx: number, ry: number): [number, number] => {
  const r = (deg * Math.PI) / 180;
  return [CX + rx * Math.cos(r), 32 + ry * Math.sin(r)];
};

/**
 * A frill ring: `n` SEPARATE inked wedges between an inner and an outer
 * ellipse. Drawing every pleat as its own piece is what makes a ruffle read as
 * folded cloth — the same frill drawn as one band with shading lines on top
 * reads flat at every size. `bow` rounds each hem into a scallop.
 */
function frillRing(
  n: number,
  r1: [number, number],
  r2: [number, number],
  fills: string[],
  bow: number,
): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const A0 = 178;
  const A1 = 2;
  for (let i = 0; i < n; i++) {
    const d0 = A0 + ((A1 - A0) * i) / n;
    const d1 = A0 + ((A1 - A0) * (i + 1)) / n;
    const i0 = ell(d0, r1[0], r1[1]);
    const i1 = ell(d1, r1[0], r1[1]);
    const o0 = ell(d0, r2[0], r2[1]);
    const o1 = ell(d1, r2[0], r2[1]);
    const om = ell((d0 + d1) / 2, r2[0] * (1 + bow), r2[1] * (1 + bow));
    out.push(
      <Piece
        key={i}
        w={0.75}
        fill={fills[i % fills.length]}
        d={
          `M${i0[0].toFixed(2)} ${i0[1].toFixed(2)} L${o0[0].toFixed(2)} ${o0[1].toFixed(2)}` +
          ` Q${om[0].toFixed(2)} ${om[1].toFixed(2)} ${o1[0].toFixed(2)} ${o1[1].toFixed(2)}` +
          ` L${i1[0].toFixed(2)} ${i1[1].toFixed(2)} Z`
        }
      />,
    );
  }
  return out;
}

/** Barrymoore — the long-point shirt collar: the stand showing above the
 *  leaves, placket and buttons filling the V between the points. */
export const BarrymooreCollar: React.FC<PartProps> = ({ colors, layer }) => {
  const c = colors.collar;
  const leaf = shade(c, 0.08);
  const btn = trimOf(c);
  return (
    <>
      {layer !== "front" && <Dome d={COLLAR_BACK} fill={shade(c, -0.28)} />}
      {layer !== "back" && (
        <>
          <CollarBase c={c} />
          <Dome d="M22.2 41.4 L27.15 41.4 L27.8 56 L21.55 56 Z" fill={shade(c, -0.05)} />
          <Dome d={LEAF_L} fill={leaf} />
          <Dome d={LEAF_R} fill={leaf} />
          <FoldShade c={c} />
          <Circle cx={CX} cy={45.4} r={1} fill={btn} stroke={INK} strokeWidth={0.35} />
          <Circle cx={CX} cy={50.4} r={1} fill={btn} stroke={INK} strokeWidth={0.35} />
        </>
      )}
    </>
  );
};

/** Cascade — a frill collar spilling into a jabot down the front. */
export const CascadeCollar: React.FC<PartProps> = ({ colors, layer }) => {
  const c = colors.collar;
  const a = shade(c, 0.16);
  const b = shade(c, -0.02);
  return (
    <>
      {layer !== "front" && <Dome d={COLLAR_BACK} fill={shade(c, -0.26)} />}
      {layer !== "back" && (
        <>
          <Dome d={GARMENT} fill={c} />
          {frillRing(8, [18.4, 8.4], [21.8, 12.6], [a, b], 0.05)}
          <Dome
            d="M20.6 41.4 Q24.675 44 29 41.4 Q30.35 45.4 27.55 47 Q24.675 48.2 21.8 47 Q19.2 45.4 20.6 41.4 Z"
            fill={a}
          />
          <Dome
            d="M21.4 45.8 Q24.675 48.2 27.95 45.8 Q29.35 50 26.95 51.8 Q24.675 53 22.4 51.8 Q20 50 21.4 45.8 Z"
            fill={b}
          />
          <Dome d={FRILL_BAND} fill={shade(c, -0.18)} />
          <Circle cx={CX} cy={39.8} r={0.9} fill={trimOf(c)} stroke={INK} strokeWidth={0.3} />
        </>
      )}
    </>
  );
};

/** Square — a square-cut neckline with a mitred border. */
export const SquareCollar: React.FC<PartProps> = ({ colors, layer }) => {
  const c = colors.collar;
  return (
    <>
      {layer !== "front" && <Dome d={COLLAR_BACK} fill={shade(c, -0.26)} />}
      {layer !== "back" && (
        <>
          <Dome
            d="M-2 56 L-2 37.4 Q3 33.4 8.4 33.2 L8.4 44.4 L40.95 44.4 L40.95 33.2 Q46.35 33.4 51.35 37.4 L51.35 56 Z"
            fill={c}
          />
          <Dome
            d="M8.4 33.2 L12.2 33.2 L12.2 41 L37.15 41 L37.15 33.2 L40.95 33.2 L40.95 44.4 L8.4 44.4 Z"
            fill={shade(c, 0.11)}
          />
          <Path
            d="M10.2 34.4 L10.2 42.8 L39.15 42.8 L39.15 34.4"
            fill="none"
            stroke={trimOf(c)}
            strokeWidth={0.7}
            strokeLinecap="round"
            opacity={0.9}
          />
          <Path
            d="M13.8 42.2 L35.55 42.2"
            fill="none"
            stroke={shade(c, -0.26)}
            strokeWidth={0.5}
            strokeLinecap="round"
            opacity={0.45}
          />
        </>
      )}
    </>
  );
};

/** Wrap — collar panels crossed over each other down a deep V. */
export const WrapCollar: React.FC<PartProps> = ({ colors, layer }) => {
  const c = colors.collar;
  return (
    <>
      {layer !== "front" && <Dome d={COLLAR_BACK} fill={shade(c, -0.28)} />}
      {layer !== "back" && (
        <>
          <Dome
            d="M-2 56 L-2 39.4 Q2.6 35.2 6.6 33.4 L24.675 47.4 L42.75 33.4 Q46.75 35.2 51.35 39.4 L51.35 56 Z"
            fill={c}
          />
          <Dome
            d="M42.75 33.2 Q35.35 39.4 24.675 43.2 L20.9 50.6 Q34.35 46.4 44.35 37.4 Z"
            fill={shade(c, -0.18)}
          />
          <Dome
            d="M6.6 33.2 Q14 39.4 24.675 43.2 L28.45 50.6 Q15 46.4 5 37.4 Z"
            fill={shade(c, 0.11)}
          />
          <Path
            d="M8.6 34.8 Q15.4 40.2 24.2 43.6"
            fill="none"
            stroke={shade(c, 0.32)}
            strokeWidth={0.6}
            strokeLinecap="round"
            opacity={0.6}
          />
          <Path
            d="M40.75 34.8 Q33.95 40.2 25.15 43.6"
            fill="none"
            stroke={shade(c, -0.36)}
            strokeWidth={0.6}
            strokeLinecap="round"
            opacity={0.5}
          />
        </>
      )}
    </>
  );
};

/** Clerical — a dark shirt with the white tab at the throat. The one collar
 *  whose fabric colour is deliberately overridden: it reads as clergy only if
 *  the shirt is dark, so the user's swatch is darkened rather than used raw. */
export const ClericalCollar: React.FC<PartProps> = ({ colors, layer }) => {
  const cloth = shade(colors.collar, -0.55);
  const band = shade(trimOf(cloth), 0.2);
  return (
    <>
      {layer !== "front" && <Dome d={COLLAR_BACK} fill={shade(cloth, -0.2)} />}
      {layer !== "back" && (
        <>
          <Dome d={GARMENT} fill={cloth} />
          <Dome
            d="M5.4 31.6 Q13.6 36.4 24.675 38.4 Q35.75 36.4 43.95 31.6 L44.55 36.4 Q35.95 41.4 24.675 43.4 Q13.4 41.4 4.8 36.4 Z"
            fill={cloth}
          />
          <Dome d="M20.9 37.8 L28.45 37.8 L28.45 43.4 L20.9 43.4 Z" fill={band} />
          <Path
            d="M6.4 33.4 Q14 38 24.675 40 Q35.35 38 42.95 33.4"
            fill="none"
            stroke={shade(cloth, 0.35)}
            strokeWidth={0.6}
            strokeLinecap="round"
            opacity={0.5}
          />
          <Dome d="M22.4 43.4 L26.95 43.4 L27.6 56 L21.75 56 Z" fill={shade(cloth, 0.1)} />
        </>
      )}
    </>
  );
};

/** Eton — the wide stiff collar lying over a darker jacket. */
export const EtonCollar: React.FC<PartProps> = ({ colors, layer }) => {
  const coat = shade(colors.collar, -0.42);
  const stiff = shade(trimOf(coat), 0.2);
  return (
    <>
      {layer !== "front" && <Dome d={COLLAR_BACK} fill={shade(coat, -0.2)} />}
      {layer !== "back" && (
        <>
          <Dome d={GARMENT} fill={coat} />
          <Dome
            d="M4 32.6 Q13.4 38.6 24.675 40.8 Q35.95 38.6 45.35 32.6 Q47.35 37.4 44.35 42.6 Q35.35 46.4 24.675 46.4 Q14 46.4 5 42.6 Q2 37.4 4 32.6 Z"
            fill={stiff}
          />
          <Path
            d="M7.4 36.4 Q15.4 41.6 24.675 43.6 Q33.95 41.6 41.95 36.4"
            fill="none"
            stroke={shade(stiff, -0.2)}
            strokeWidth={0.55}
            strokeLinecap="round"
            opacity={0.55}
          />
          <Dome d="M22.4 44.6 L26.95 44.6 L27.6 56 L21.75 56 Z" fill={coat} />
        </>
      )}
    </>
  );
};

/** Horseshoe — one continuous rounded collar open at the throat. */
export const HorseshoeCollar: React.FC<PartProps> = ({ colors, layer }) => {
  const c = colors.collar;
  return (
    <>
      {layer !== "front" && <Dome d={COLLAR_BACK} fill={shade(c, -0.26)} />}
      {layer !== "back" && (
        <>
          <CollarBase c={c} />
          <Dome
            d="M5 34.2 Q13.4 39.2 24.675 41.2 Q35.95 39.2 44.35 34.2 L45.75 38.6 Q37.35 45.4 24.675 47.6 Q12 45.4 3.6 38.6 Z"
            fill={shade(c, 0.1)}
          />
          <Path
            d="M8.4 36.6 Q15.6 41.4 24.675 43.4 Q33.75 41.4 40.95 36.6"
            fill="none"
            stroke={shade(c, -0.22)}
            strokeWidth={0.6}
            strokeLinecap="round"
            opacity={0.5}
          />
          <Dome d="M22.6 45.4 L26.75 45.4 L27.4 56 L21.95 56 Z" fill={shade(c, -0.06)} />
        </>
      )}
    </>
  );
};

/** Chelsea — long lapels sweeping down a deep open V. */
export const ChelseaCollar: React.FC<PartProps> = ({ colors, layer }) => {
  const c = colors.collar;
  const lapel = shade(c, 0.1);
  return (
    <>
      {layer !== "front" && <Dome d={COLLAR_BACK} fill={shade(c, -0.28)} />}
      {layer !== "back" && (
        <>
          <Dome
            d="M-2 56 L-2 38.4 Q2.6 34.2 6.6 33 L24.675 49.6 L42.75 33 Q46.75 34.2 51.35 38.4 L51.35 56 Z"
            fill={c}
          />
          <Dome d="M6.6 32.8 Q13.4 39.4 24.675 46.4 L21.4 52.6 Q10.4 44.6 4.6 36.6 Z" fill={lapel} />
          <Dome d="M42.75 32.8 Q35.95 39.4 24.675 46.4 L27.95 52.6 Q38.95 44.6 44.75 36.6 Z" fill={lapel} />
          <Path
            d="M9.4 34.6 Q15.4 40.6 22.4 46.4 M39.95 34.6 Q33.95 40.6 26.95 46.4"
            fill="none"
            stroke={shade(c, -0.24)}
            strokeWidth={0.55}
            strokeLinecap="round"
            opacity={0.5}
          />
        </>
      )}
    </>
  );
};

// ── Headgear, second wave ────────────────────────────────────────────────────
//
// Every crown here closes over the head's TOP EDGE (crown y≈8, measured sides
// x 6.07→43.27) so no scalp or hair shows above the hat, and every lower edge
// stays above y≈18.8 at the eye columns (x 16 / 32).
//
// The hard constraint is the tile, not the head: the circular housing clips
// everything above y≈0 and narrows fast — x 14.4→33.6 at y=2, x 9.3→38.7 at
// y=5. A true tall crown simply disappears above the frame, so these are
// proportioned to peak just inside it. That is why the whole hat catalog reads
// low-crowned; it is the housing, not the drawing.

/** A riveted iron helm with bone horns. */
export const VikingHelm: React.FC<PartProps> = () => (
  <>
    <Dome d="M6.6 15.6 C5.8 6.8 10 3 24.675 3 C39.35 3 43.55 6.8 42.75 15.6 C34 13.4 15 13.4 6.6 15.6 Z" fill="#9AA3AD" />
    <Dome d="M6.8 12.6 Q24.675 10.2 42.55 12.6 L42.55 15.4 Q24.675 13 6.8 15.4 Z" fill="#6E7681" />
    <Path d="M24.675 3 L24.675 13" fill="none" stroke="#6E7681" strokeWidth={0.9} strokeLinecap="round" opacity={0.8} />
    <Dome d="M8 13.4 C1.6 12.6 -1.4 7 0.4 1.8 C2.4 6 5.4 9 9.4 9.8 Z" fill="#EDE4CE" />
    <Dome d="M41.35 13.4 C47.75 12.6 50.75 7 48.95 1.8 C46.95 6 43.95 9 39.95 9.8 Z" fill="#EDE4CE" />
    <Circle cx={12.4} cy={13.4} r={0.85} fill="#CBD3DB" />
    <Circle cx={CX} cy={11.6} r={0.85} fill="#CBD3DB" />
    <Circle cx={36.95} cy={13.4} r={0.85} fill="#CBD3DB" />
  </>
);

/** A soft panelled flat cap with its short stitched brim. */
export const NewsboyCap: React.FC<PartProps> = () => (
  <>
    <Dome d="M5.6 15.2 C4.8 6 9 2.6 24.675 2.6 C40.35 2.6 44.55 6 43.75 15.2 C34 13 15 13 5.6 15.2 Z" fill="#7D8A6A" />
    <Path
      d="M24.675 2.8 Q23.4 8.4 24.675 14 M15.4 3.8 Q16.6 9 15.6 14 M33.95 3.8 Q32.75 9 33.75 14"
      fill="none"
      stroke="#5E6B4E"
      strokeWidth={0.8}
      strokeLinecap="round"
      opacity={0.7}
    />
    <Circle cx={CX} cy={3.4} r={1.3} fill="#5E6B4E" stroke={INK} strokeWidth={0.5} />
    <Sheen d="M6.2 14.8 Q24.675 12.2 43.15 14.8 Q41.35 18.2 24.675 17.6 Q8 18.2 6.2 14.8 Z" fill="#6B7759" />
  </>
);

/** A safety helmet — ridged shell, short all-round brim. */
export const HardHat: React.FC<PartProps> = () => (
  <>
    <Dome d="M6 15.4 C5.2 6.6 9.4 3 24.675 3 C39.95 3 44.15 6.6 43.35 15.4 C34 13.2 15 13.2 6 15.4 Z" fill="#F2A833" />
    <Path d="M24.675 3.2 L24.675 14" fill="none" stroke="#C07E1C" strokeWidth={1.1} strokeLinecap="round" opacity={0.85} />
    <Path
      d="M14.4 4.6 Q13.4 9.4 14 14.2 M34.95 4.6 Q35.95 9.4 35.35 14.2"
      fill="none"
      stroke="#C07E1C"
      strokeWidth={0.8}
      strokeLinecap="round"
      opacity={0.6}
    />
    <Sheen d="M4.4 15.2 Q24.675 12.4 44.95 15.2 Q43 18.4 24.675 17.8 Q6.35 18.4 4.4 15.2 Z" fill="#D9911F" />
  </>
);

/** Santa's hat — the flop and bobble kept INSIDE the tile; drawn at the
 *  reference's x≈49 they fell outside the circle entirely and never rendered. */
export const SantaHat: React.FC<PartProps> = () => (
  <>
    <Dome d="M6 15 C5.2 6.6 9.4 3 24.675 3 C37 3 42.6 5.8 43.8 10.4 C44.6 13.4 41 13.6 36 12.8 C26 11.4 13.4 12.8 6 15 Z" fill="#C0362F" />
    <Dome d="M38.6 9.4 C43.6 8 45.8 10.6 44.6 13.6 C43.8 15.6 41 15.8 39.4 14.4 Z" fill="#C0362F" />
    <Sheen d="M4.8 14.4 Q24.675 11.4 44.4 14.4 L44.4 18 Q24.675 15 4.8 18 Z" fill="#F4F1EA" />
    <Circle cx={43.2} cy={14.8} r={2.5} fill="#F4F1EA" stroke={INK} strokeWidth={0.8} />
    <Path d="M10.4 6.4 Q16.4 4 23.4 4" fill="none" stroke="#DE6A62" strokeWidth={1} strokeLinecap="round" opacity={0.5} />
  </>
);

/** A tied head bandana — wrap, side knot, and a spotted print. */
export const BandanaWrap: React.FC<PartProps> = () => (
  <>
    <Dome d="M5.4 16.6 C4.6 7 9 3.4 24.675 3.4 C40.35 3.4 44.75 7 43.95 16.6 C34 14.4 15 14.4 5.4 16.6 Z" fill="#B4443E" />
    <Dome d="M41.4 13.4 L46.9 15.4 L44.4 19.2 L40.4 16.6 Z" fill="#963630" />
    <Dome d="M43.4 17.4 L47.4 20.2 L42.9 21.2 Z" fill="#963630" />
    <Circle cx={13.4} cy={9.4} r={0.8} fill="#F2E4E2" />
    <Circle cx={21.4} cy={6.6} r={0.8} fill="#F2E4E2" />
    <Circle cx={30.4} cy={7.4} r={0.8} fill="#F2E4E2" />
    <Circle cx={36.4} cy={11.4} r={0.8} fill="#F2E4E2" />
    <Circle cx={17.4} cy={13} r={0.7} fill="#F2E4E2" />
    <Circle cx={27.4} cy={12.4} r={0.7} fill="#F2E4E2" />
  </>
);

// ── Eyewear, second wave (lenses on the eye anchors 16,22 / 32,22) ───────────

/** Daisy shades — petal rings around dark lenses. */
export const DaisyShades: React.FC<PartProps> = () => (
  <>
    <Path d="M10.4 21 L6.5 19.6 M37.6 21 L41.5 19.6" fill="none" stroke="#D9A21B" strokeWidth={1.4} strokeLinecap="round" />
    <Path d="M21.4 21.4 H27.95" fill="none" stroke="#D9A21B" strokeWidth={1.4} strokeLinecap="round" />
    {[16, 32].map((cx) => (
      <G key={cx}>
        {[0, 1, 2, 3, 4, 5, 6, 7].map((k) => (
          <Circle
            key={k}
            cx={cx + Math.cos((k * Math.PI) / 4) * 4.6}
            cy={22 + Math.sin((k * Math.PI) / 4) * 4.6}
            r={2.4}
            fill="#F2B826"
            stroke={INK}
            strokeWidth={0.45}
          />
        ))}
        <Circle cx={cx} cy={22} r={3.6} fill="#23202B" />
        <Circle cx={cx - 1.1} cy={20.9} r={1} fill="#FFFFFF" opacity={0.55} />
      </G>
    ))}
  </>
);

/** Cinema 3D glasses — one red lens, one cyan, white card frame. */
export const ThreeDGlasses: React.FC<PartProps> = () => (
  <>
    <Rect x={9.8} y={17.8} width={12.4} height={8.8} rx={1.4} fill="#D93B3B" />
    <Rect x={27.15} y={17.8} width={12.4} height={8.8} rx={1.4} fill="#2FA8C4" />
    <Path d="M9.8 18.4 H39.55" fill="none" stroke="#F4F1EA" strokeWidth={2.6} />
    <Rect x={9.8} y={17.8} width={12.4} height={8.8} rx={1.4} fill="none" stroke="#F4F1EA" strokeWidth={1.3} />
    <Rect x={27.15} y={17.8} width={12.4} height={8.8} rx={1.4} fill="none" stroke="#F4F1EA" strokeWidth={1.3} />
    <Path d="M22.2 21 H27.15" fill="none" stroke="#F4F1EA" strokeWidth={1.6} strokeLinecap="round" />
    <Path d="M9.8 20 L6 18.8 M39.55 20 L43.35 18.8" fill="none" stroke="#F4F1EA" strokeWidth={1.6} strokeLinecap="round" />
  </>
);

/** Oversized shades — big soft-cornered dark lenses. */
export const OversizedShades: React.FC<PartProps> = () => (
  <>
    <Rect x={8.6} y={16.6} width={13.4} height={11.4} rx={3.4} fill="#23202B" />
    <Rect x={27.35} y={16.6} width={13.4} height={11.4} rx={3.4} fill="#23202B" />
    <Rect x={8.6} y={16.6} width={13.4} height={11.4} rx={3.4} fill="none" stroke="#2A2530" strokeWidth={1.5} />
    <Rect x={27.35} y={16.6} width={13.4} height={11.4} rx={3.4} fill="none" stroke="#2A2530" strokeWidth={1.5} />
    <Path d="M22 19.4 H27.35" fill="none" stroke="#2A2530" strokeWidth={1.6} strokeLinecap="round" />
    <Path d="M8.6 19 L5 17.8 M40.75 19 L44.35 17.8" fill="none" stroke="#2A2530" strokeWidth={1.6} strokeLinecap="round" />
    <Path d="M11 19.6 L15.4 18.6 M29.8 19.6 L34.2 18.6" fill="none" stroke="#FFFFFF" strokeWidth={1.1} strokeLinecap="round" opacity={0.45} />
  </>
);

/** Ski goggles — one wide lens on a strap across the head. */
export const SkiGoggles: React.FC<PartProps> = () => (
  <>
    <Path d="M4.4 20.6 Q24.675 17.6 44.95 20.6" fill="none" stroke="#B4443E" strokeWidth={3.4} />
    <Dome d="M7.4 18.4 Q24.675 15.8 41.95 18.4 Q43.35 24.6 39.35 26.8 Q24.675 28.6 9.95 26.8 Q5.95 24.6 7.4 18.4 Z" fill="#E2E6EA" />
    <Dome d="M9.6 20 Q24.675 17.8 39.75 20 Q40.75 24 37.75 25.4 Q24.675 26.8 11.6 25.4 Q8.6 24 9.6 20 Z" fill="#4A9BD1" />
    <Path d="M12.4 21 Q18.4 19.6 24.4 19.4" fill="none" stroke="#CFE9F7" strokeWidth={1.2} strokeLinecap="round" opacity={0.7} />
  </>
);

// ── Backdrops ────────────────────────────────────────────────────────────────
//
// The `bg` slot has existed since D2 and never held anything — the tile was a
// flat colour. These are patterns drawn OVER that colour, inside the tile mask.
//
// Two things decide whether a backdrop works here, and both were learned the
// expensive way:
//
// SCALE. The head plate covers the middle, so the only surface a backdrop owns
// is a lens above the head and a band down each side — roughly seven units
// wide. Motifs are therefore ~4–6 units on a ~7-unit pitch, sized so a WHOLE
// one fits in that band. Drawing them large on the theory that a cropped motif
// still reads does not work: a sliver of a heart is a blob.
//
// COLOUR. Each pattern takes two tones a real hue apart (see `hue()`), not one
// tone shaded up and down — one hue lightened and darkened reads as a flat
// wash no matter what the motif is.

/**
 * Tiles a motif across the tile, skipping every position FULLY sealed behind
 * the head plate (x 8.1–41.3, y 10.1–48.8, less a motif radius).
 *
 * The skip is a real saving rather than tidiness — a pattern is 40-odd motifs,
 * and the Community wall renders dozens of avatars at once. Positions that
 * merely STRADDLE the head's edge are kept: they are half-visible, the head
 * clips them, and dropping those is what left the side bands bare.
 */
function field(
  pitch: number,
  motif: (x: number, y: number, r: number, c: number, key: string) => React.ReactNode,
): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const n = Math.ceil(62 / pitch);
  for (let r = 0; r <= n; r++) {
    for (let c = 0; c <= n; c++) {
      const x = +(c * pitch + (r % 2 ? pitch / 2 : 0) - 6).toFixed(1);
      const y = +(r * pitch - 6).toFixed(1);
      // Sealed behind the head plate.
      if (x > 11.4 && x < 38 && y > 13.4 && y < 46) continue;
      // Outside the housing altogether. The radius covers the SQUARE tile as
      // well as the circle — the square's rounded corner reaches ~29.4 units
      // from centre, plus a motif radius — because the viewer's own avatar
      // renders square in the Community room and in Discover. Culling to the
      // circle alone would have eaten the corners there. Worth ~30% of the
      // motifs, which matters most in the Studio, where a dozen previews each
      // draw a full avatar and the grid does not virtualise.
      if (Math.hypot(x - 24, y - 24) > 33) continue;
      out.push(motif(x, y, r, c, `${r}-${c}`));
    }
  }
  return out;
}

/** The flat colour every pattern sits on. Full-bleed; the tile mask trims it. */
const Field: React.FC<{ fill: string }> = ({ fill }) => (
  <Rect x={-8} y={-8} width={64} height={64} fill={fill} />
);

const HEART_D =
  "M0 6 C-5 2.4 -6.4 -0.6 -6.4 -3 C-6.4 -5.6 -4 -6.6 -2 -4.6 C-1 -3.6 -0.4 -2.8 0 -2 C0.4 -2.8 1 -3.6 2 -4.6 C4 -6.6 6.4 -5.6 6.4 -3 C6.4 -0.6 5 2.4 0 6 Z";

export const BgHearts: React.FC<PartProps> = ({ colors }) => {
  const b = colors.bg;
  const f = hue(b, 0, -0.04, 0.16);
  return (
    <>
      <Field fill={hue(b, 0, 0.5, -0.44)} />
      {field(7, (x, y, r, c, key) => (
        <Path
          key={key}
          transform={`translate(${x} ${y}) rotate(${((r + c) % 3) * 12 - 12}) scale(0.42)`}
          d={HEART_D}
          fill={f}
          stroke={INK}
          strokeWidth={2.6}
          strokeLinejoin="round"
        />
      ))}
    </>
  );
};

export const BgEggs: React.FC<PartProps> = ({ colors }) => {
  const b = colors.bg;
  const white = hue(b, 0, 0.56, -0.5);
  const yolk = hue(b, 46, 0.12, 0.22);
  return (
    <>
      <Field fill={hue(b, 0, -0.02, 0.18)} />
      {field(7.4, (x, y, r, c, key) => (
        <G key={key} transform={`translate(${x} ${y}) rotate(${((r * c) % 4) * 20}) scale(0.42)`}>
          <Path
            d="M0 -6 Q6 -6.6 6.4 -1.4 Q9 2 5.4 5 Q1.4 8.4 -3 5.6 Q-7.4 3.6 -6.4 -1 Q-6 -5.6 0 -6 Z"
            fill={white}
            stroke={INK}
            strokeWidth={2.6}
            strokeLinejoin="round"
          />
          <Circle cx={0} cy={-0.4} r={2.8} fill={yolk} />
        </G>
      ))}
    </>
  );
};

/** Cow spots are wide by nature — on a tight pitch they merge into one dark
 *  mass, so this one is deliberately the sparsest field in the set. */
const COW_BLOBS = [
  "M0 -3 Q4 -4.4 4.6 -1 Q5.2 2.6 2 3.4 Q-1.6 4.2 -2.8 1.6 Q-3.8 -1.4 0 -3 Z",
  "M0 -2.6 Q3.4 -4 4.4 -1.4 Q5.4 1.4 3 3.2 Q0 5.2 -2.4 3 Q-4.4 1 -3 -1.4 Q-2 -3 0 -2.6 Z",
  "M-1 -3.2 Q2.6 -4.4 4.2 -1.8 Q5.6 0.6 3.4 2.8 Q1 5 -1.8 3.4 Q-4.2 2 -3.6 -0.6 Q-3.2 -2.6 -1 -3.2 Z",
];

export const BgCow: React.FC<PartProps> = ({ colors }) => {
  const b = colors.bg;
  const spot = hue(b, 0, -0.32, 0.08);
  return (
    <>
      <Field fill={hue(b, 0, 0.54, -0.52)} />
      {field(9.6, (x, y, r, c, key) => (
        <Path
          key={key}
          transform={`translate(${x} ${y}) rotate(${(r * 3 + c * 5) % 360}) scale(0.72)`}
          d={COW_BLOBS[(r + c + 9) % 3]}
          fill={spot}
        />
      ))}
    </>
  );
};

export const BgMonstera: React.FC<PartProps> = ({ colors }) => {
  const b = colors.bg;
  const dark = hue(b, 0, -0.14, 0.08);
  const light = hue(b, 26, 0.16, 0.12);
  return (
    <>
      <Field fill={hue(b, 12, -0.22, 0.12)} />
      {field(7.6, (x, y, r, c, key) => (
        <G key={key} transform={`translate(${x} ${y}) rotate(${((r + c) % 4) * 35 - 45}) scale(0.34)`}>
          <Path
            d="M0 -9 Q8 -7 8.4 0 Q8.8 7 0 9.6 Q-8.8 7 -8.4 0 Q-8 -7 0 -9 Z"
            fill={(r + c) % 2 ? dark : light}
            stroke={INK}
            strokeWidth={3}
            strokeLinejoin="round"
          />
          <Path
            d="M0 -8 V9 M0 -3.4 L5 -4.8 M0 0.6 L6 0 M0 4.6 L5 5"
            fill="none"
            stroke={INK}
            strokeWidth={2.2}
            strokeLinecap="round"
          />
        </G>
      ))}
    </>
  );
};

export const BgStars: React.FC<PartProps> = ({ colors }) => {
  const b = colors.bg;
  const f = hue(b, 44, 0.14, 0.2);
  return (
    <>
      <Field fill={hue(b, 0, -0.1, 0.08)} />
      {field(6.8, (x, y, r, c, key) => (
        <G key={key}>
          <Star5 x={x} y={y} s={(r + c) % 2 ? 2.9 : 2.2} fill={f} />
        </G>
      ))}
    </>
  );
};

export const BgBolts: React.FC<PartProps> = ({ colors }) => {
  const b = colors.bg;
  const f = hue(b, 40, 0.12, 0.22);
  return (
    <>
      <Field fill={hue(b, 0, -0.06, 0.06)} />
      {field(6.8, (x, y, r, c, key) => (
        <Path
          key={key}
          transform={`translate(${x} ${y}) rotate(${((r + c) % 3) * 14 - 14}) scale(0.62)`}
          d="M1.6 -7 L-3.4 1.2 H-0.4 L-2 7 L3.6 -1.4 H0.4 Z"
          fill={f}
          stroke={INK}
          strokeWidth={1.8}
          strokeLinejoin="round"
        />
      ))}
    </>
  );
};

export const BgDots: React.FC<PartProps> = ({ colors }) => {
  const b = colors.bg;
  const a = hue(b, 34, 0.22, 0.1);
  const c2 = hue(b, 0, 0.5, -0.4);
  return (
    <>
      <Field fill={hue(b, 0, -0.04, 0.08)} />
      {field(6.6, (x, y, r, c, key) => (
        <Circle
          key={key}
          cx={x}
          cy={y}
          r={(r + c) % 2 ? 2.9 : 1.9}
          fill={(r + c) % 2 ? a : c2}
          stroke={INK}
          strokeWidth={0.9}
        />
      ))}
    </>
  );
};

export const BgChecks: React.FC<PartProps> = ({ colors }) => {
  const b = colors.bg;
  const a = hue(b, 0, 0.02, 0.14);
  const squares: React.ReactNode[] = [];
  for (let r = -1; r < 12; r++) {
    for (let c = -1; c < 12; c++) {
      if ((r + c) % 2 !== 0) continue;
      const x = c * 6 - 4;
      const y = r * 6 - 4;
      if (x > 11.4 && x < 36 && y > 13.4 && y < 42) continue;
      squares.push(<Rect key={`${r}-${c}`} x={x} y={y} width={6} height={6} fill={a} />);
    }
  }
  return (
    <>
      <Field fill={hue(b, 0, 0.5, -0.46)} />
      {squares}
    </>
  );
};

/** Radial rather than tiled: the arms all converge behind the head, so what
 *  reaches the visible band is a fan of stripes at every angle. */
export const BgSwirl: React.FC<PartProps> = ({ colors }) => {
  const b = colors.bg;
  const a = hue(b, 0, 0.04, 0.14);
  const arms: React.ReactNode[] = [];
  for (let i = 0; i < 16; i++) {
    const t = ((i * 22.5) * Math.PI) / 180;
    const p = (rad: number, off: number) =>
      `${(24 + Math.cos(t + off) * rad).toFixed(1)} ${(24 + Math.sin(t + off) * rad).toFixed(1)}`;
    arms.push(
      <Path
        key={i}
        d={`M24 24 Q${p(20, 0.2)} ${p(46, 0.56)} L${p(46, 0.76)} Q${p(20, 0.38)} 24 24 Z`}
        fill={i % 2 ? a : INK}
      />,
    );
  }
  return (
    <>
      <Field fill={hue(b, 0, 0.5, -0.44)} />
      {arms}
    </>
  );
};

/** Four organic colour fields rather than a repeat — the one pattern here that
 *  is meant to be bigger than the visible band. */
export const BgBlob: React.FC<PartProps> = ({ colors }) => {
  const b = colors.bg;
  return (
    <>
      <Field fill={hue(b, 0, 0.46, -0.42)} />
      <Path d="M-8 -8 Q14 -6 12 10 Q10 24 20 30 Q28 36 22 48 Q18 56 -8 56 Z" fill={hue(b, 0, 0.04, 0.12)} />
      <Path d="M14 -8 Q34 -8 40 6 Q44 16 34 20 Q22 24 24 10 Q25 -2 14 -8 Z" fill={hue(b, 44, 0.12, 0.14)} />
      <Path d="M56 8 Q44 14 46 26 Q48 38 56 40 Z" fill={hue(b, -46, 0.02, 0.16)} />
      <Path d="M26 56 Q22 42 34 38 Q46 34 50 46 Q52 54 48 56 Z" fill={hue(b, 128, 0.02, 0.12)} />
    </>
  );
};

export const BgWavyBands: React.FC<PartProps> = ({ colors }) => {
  const b = colors.bg;
  const a = hue(b, 0, 0.02, 0.14);
  const c2 = hue(b, 40, 0.16, 0.18);
  const bands: React.ReactNode[] = [];
  for (let i = 0; i < 7; i++) {
    const y = -6 + i * 9.5;
    bands.push(
      <Path
        key={i}
        d={`M-8 ${y} Q6 ${y - 3.6} 20 ${y} Q34 ${y + 3.6} 56 ${y} L56 ${y + 7} Q34 ${y + 10.6} 20 ${y + 7} Q6 ${y + 3.4} -8 ${y + 7} Z`}
        fill={i % 2 ? a : c2}
        stroke={INK}
        strokeWidth={0.9}
        strokeLinejoin="round"
      />,
    );
  }
  return (
    <>
      <Field fill={hue(b, 0, 0.5, -0.44)} />
      {bands}
    </>
  );
};

// ── Props, second wave ───────────────────────────────────────────────────────
//
// Props are the only slot that escapes the tile mask, so they get real room
// beside the head — which is why they carry character better than anything
// worn. Left-hand props sit around x 2–16, right-hand ones x 33–53.

export const MugProp: React.FC<PartProps> = () => (
  <>
    <Dome d="M36 38 H48 V45 Q48 49 44 49 H40 Q36 49 36 45 Z" fill="#E8E2D6" />
    <Dome d="M48 39.6 Q52.4 39.6 52.4 42.4 Q52.4 45.2 48 45.2 Z" fill="#E8E2D6" />
    <Path d="M37.4 39.4 H46.6 V41.4 Q42 42.6 37.4 41.4 Z" fill="#7A5236" />
    <Path
      d="M39 34.6 Q40.6 33 39.4 31.4 M43 34.6 Q44.6 33 43.4 31.4"
      fill="none"
      stroke="#D8D2C6"
      strokeWidth={0.9}
      strokeLinecap="round"
      opacity={0.55}
    />
  </>
);

export const PlantProp: React.FC<PartProps> = () => (
  <>
    <Dome d="M2.6 42 H14.6 L13.2 51 Q13 52.4 11.6 52.4 H5.6 Q4.2 52.4 4 51 Z" fill="#C4703F" />
    <Path d="M2.2 40.6 H15 V43 H2.2 Z" fill="#A85C31" />
    <Path d="M8.6 42 V30" fill="none" stroke="#3E7D4E" strokeWidth={1.2} strokeLinecap="round" />
    <Dome d="M8.6 33 Q3 31.4 2.6 26.4 Q8 26.6 8.6 32 Z" fill="#3E7D4E" />
    <Dome d="M8.6 36 Q14.6 34.6 15 29.6 Q9.4 29.8 8.6 35 Z" fill="#4E9660" />
    <Dome d="M8.6 30.4 Q5.4 27 6.6 22.6 Q10.6 25 8.6 29.6 Z" fill="#57A86B" />
  </>
);

export const CatProp: React.FC<PartProps> = () => (
  <>
    <Dome
      d="M36.4 41 Q36.4 34.6 42.4 34.6 Q48.4 34.6 48.4 41 L48.4 50 Q48.4 52.4 46 52.4 H38.8 Q36.4 52.4 36.4 50 Z"
      fill="#5A5560"
    />
    <Dome d="M36.8 36.6 L37.4 31.6 L41.4 34.8 Z" fill="#5A5560" />
    <Dome d="M48 36.6 L47.4 31.6 L43.4 34.8 Z" fill="#5A5560" />
    <Circle cx={39.6} cy={39.6} r={0.95} fill={INK} />
    <Circle cx={45.2} cy={39.6} r={0.95} fill={INK} />
    <Path
      d="M42.4 41.6 Q41.4 43 40.2 42.4 M42.4 41.6 Q43.4 43 44.6 42.4"
      fill="none"
      stroke={INK}
      strokeWidth={0.7}
      strokeLinecap="round"
    />
    <Path d="M41.6 40.8 L43.2 40.8 L42.4 41.8 Z" fill="#E2707E" />
    <Path
      d="M48.4 48 Q53.6 47.4 52.2 42"
      fill="none"
      stroke="#5A5560"
      strokeWidth={2.2}
      strokeLinecap="round"
    />
  </>
);

export const TrophyProp: React.FC<PartProps> = () => (
  <>
    <Dome d="M37.4 32 H47.4 L46.6 40 Q46.2 43.4 42.4 43.4 Q38.6 43.4 38.2 40 Z" fill={GOLD} />
    <Path
      d="M37.4 33.4 Q34 33.6 34.2 36.4 Q34.4 38.8 37.8 39 M47.4 33.4 Q50.8 33.6 50.6 36.4 Q50.4 38.8 47 39"
      fill="none"
      stroke={GOLD}
      strokeWidth={1.3}
      strokeLinecap="round"
    />
    <Rect x={40.9} y={43.4} width={3} height={4} rx={0.4} fill="#D9A93F" />
    <Dome d="M37.6 47.4 H47.2 V50.6 H37.6 Z" fill="#8E6B25" />
    <Star5 x={42.4} y={36.6} s={2} fill="#FFF3C4" />
  </>
);

export const PlaneProp: React.FC<PartProps> = () => (
  <>
    <Dome d="M34 40 L52 31.4 L46.4 46.6 L42.6 41.6 Z" fill="#F2F0EB" />
    <Path d="M42.6 41.6 L52 31.4 L44.4 42.8 Z" fill="#D6D2C8" />
    <Path d="M42.6 41.6 L44.4 42.8 L43.4 46 Z" fill="#BDB8AD" />
    <Path
      d="M33.4 45.4 Q37.4 44 40.4 44.6 M31.4 49 Q36.4 47 40.6 47.4"
      fill="none"
      stroke="#F2F0EB"
      strokeWidth={0.8}
      strokeLinecap="round"
      opacity={0.45}
    />
  </>
);

export const BalloonProp: React.FC<PartProps> = () => (
  <>
    <Path
      d="M43.4 50 Q41 42 43.4 34.6"
      fill="none"
      stroke="#EDE6D8"
      strokeWidth={0.8}
      strokeLinecap="round"
      opacity={0.9}
    />
    <Dome d="M43.4 34.8 L41.8 32 L45 32 Z" fill="#C0362F" />
    <Ellipse cx={43.4} cy={24.6} rx={7} ry={8.4} fill="#C0362F" stroke={INK} strokeWidth={1.1} />
    <Ellipse cx={40.6} cy={21} rx={1.9} ry={2.8} fill="#FFFFFF" opacity={0.4} transform="rotate(-20 40.6 21)" />
  </>
);

export const SkateboardProp: React.FC<PartProps> = () => (
  <>
    <Dome
      d="M1.6 41.4 Q1.6 38.4 5 38.4 L14.6 38.4 Q18 38.4 18 41.4 Q18 44.4 14.6 44.4 L5 44.4 Q1.6 44.4 1.6 41.4 Z"
      fill="#B4443E"
    />
    <Path d="M4.4 41.4 H15.2" fill="none" stroke="#D9736C" strokeWidth={0.8} strokeLinecap="round" opacity={0.5} />
    <Circle cx={5.4} cy={46.4} r={1.9} fill="#E8E2D6" stroke={INK} strokeWidth={0.6} />
    <Circle cx={14.2} cy={46.4} r={1.9} fill="#E8E2D6" stroke={INK} strokeWidth={0.6} />
    <Path d="M5.4 44.4 V45.4 M14.2 44.4 V45.4" fill="none" stroke="#6E6A64" strokeWidth={1} />
  </>
);

export const DuckProp: React.FC<PartProps> = () => (
  <>
    <Dome d="M36.4 44.4 Q36.4 38 42.4 38 Q48.4 38 48.4 44.4 Q48.4 50.4 42.4 50.4 Q36.4 50.4 36.4 44.4 Z" fill="#F2C230" />
    <Dome d="M44.4 38.6 Q44.4 34 48.4 34 Q52.4 34 52.4 38 Q52.4 41.4 48.8 41.6 Z" fill="#F2C230" />
    <Path d="M52 37 L55.4 38.2 L52 39.6 Z" fill="#E8843F" />
    <Circle cx={49.6} cy={36.8} r={0.85} fill={INK} />
    <Path d="M37.4 46.4 Q41.4 48.4 45.4 46.4" fill="none" stroke="#D9A21B" strokeWidth={0.9} strokeLinecap="round" opacity={0.8} />
  </>
);

export const DogProp: React.FC<PartProps> = () => (
  <>
    <Dome
      d="M36 42.4 Q36 35.4 42.4 35.4 Q48.8 35.4 48.8 42.4 L48.8 50.4 Q48.8 52.6 46.4 52.6 H38.4 Q36 52.6 36 50.4 Z"
      fill="#C08A4E"
    />
    <Dome d="M35.4 36.4 Q32.4 38.4 33.4 43.4 Q36.4 43 36.8 39 Z" fill="#8E6335" />
    <Dome d="M49.4 36.4 Q52.4 38.4 51.4 43.4 Q48.4 43 48 39 Z" fill="#8E6335" />
    <Circle cx={39.8} cy={41.4} r={0.95} fill={INK} />
    <Circle cx={45} cy={41.4} r={0.95} fill={INK} />
    <Ellipse cx={42.4} cy={44.6} rx={1.6} ry={1.2} fill={INK} />
    <Path
      d="M42.4 45.8 V47.4 M42.4 47.4 Q40.6 48.6 39.4 47.4 M42.4 47.4 Q44.2 48.6 45.4 47.4"
      fill="none"
      stroke={INK}
      strokeWidth={0.7}
      strokeLinecap="round"
    />
  </>
);

export const IceCreamProp: React.FC<PartProps> = () => (
  <>
    <Dome d="M37.4 40 L47.4 40 L43.6 51.4 Q42.4 53 41.2 51.4 Z" fill="#E8B87A" />
    <Path d="M39 43 L45.4 43 M40 46 L44.6 46" fill="none" stroke="#C08A4E" strokeWidth={0.7} strokeLinecap="round" opacity={0.8} />
    <Dome d="M37.4 40 Q37.4 35.4 41.4 35 Q41.4 31 45.4 32 Q49.4 33.4 47.8 37.4 Q49.4 39.4 47.4 40 Z" fill="#F2A0B4" />
    <Circle cx={43.4} cy={32.6} r={1.4} fill="#C0362F" stroke={INK} strokeWidth={0.5} />
  </>
);

export const ControllerProp: React.FC<PartProps> = () => (
  <>
    <Dome
      d="M34.4 42 Q34.4 37.4 39.4 37.4 H47.4 Q52.4 37.4 52.4 42 Q52.4 47.4 48.4 47.4 Q45.4 47.4 44.4 45.4 H42.4 Q41.4 47.4 38.4 47.4 Q34.4 47.4 34.4 42 Z"
      fill="#4E5D6C"
    />
    <Path d="M38 41 H41 M39.5 39.6 V42.4" fill="none" stroke="#E8E2D6" strokeWidth={1.2} strokeLinecap="round" />
    <Circle cx={47.4} cy={40.4} r={1} fill="#C0362F" />
    <Circle cx={49.6} cy={42.6} r={1} fill="#5BA88A" />
    <Circle cx={45.4} cy={42.6} r={1} fill="#E8B93F" />
  </>
);

export const SunflowerProp: React.FC<PartProps> = () => (
  <>
    <Path d="M43.4 52.4 Q42.4 46 43.4 41.4" fill="none" stroke="#3E7D4E" strokeWidth={1.8} strokeLinecap="round" />
    <Dome d="M43.4 46.4 Q39.4 44.4 37.4 46.4 Q40.4 49 43.4 47.6 Z" fill="#4E9660" />
    {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
      <Ellipse
        key={i}
        cx={43.4 + Math.cos((i * Math.PI) / 4) * 4.4}
        cy={37.4 + Math.sin((i * Math.PI) / 4) * 4.4}
        rx={2.4}
        ry={1.6}
        fill="#F2C230"
      />
    ))}
    <Circle cx={43.4} cy={37.4} r={3} fill="#8E5B2A" />
    <Circle cx={43.4} cy={37.4} r={2.2} fill="#6B4420" />
  </>
);

// ── Hair, second wave ────────────────────────────────────────────────────────
//
// The head plate covers x 8.1–41.3, so a "back" drape is only visible in the
// two slivers either side — roughly x 0–8 and 41–48. Every style below puts its
// volume in that band; a drape drawn any further in is simply invisible, which
// is how the first attempts at these were lost.

export const HairAfro: React.FC<PartProps> = ({ colors, layer }) => {
  const h = colors.hair;
  return (
    <>
      {layer !== "front" && (
        <>
          <Dome d="M8.4 14 Q0.4 15.4 0.6 24 Q0.8 32.4 8.4 33 Q6.4 24 8.4 14 Z" fill={h} />
          <Dome d="M40.95 14 Q48.95 15.4 48.75 24 Q48.55 32.4 40.95 33 Q42.95 24 40.95 14 Z" fill={h} />
        </>
      )}
      {layer !== "back" && (
        <>
          <Dome
            d="M4.4 22 C2.4 11 9.4 2.6 24.675 2.6 C39.95 2.6 46.95 11 44.95 22 C44.4 25.6 41.4 26 40.6 22.6 C40 18.6 40.2 16.6 40.4 14.6 C34 11 28 13.6 24.675 13.6 C21.35 13.6 15.4 11 8.9 14.6 C9.1 16.6 9.3 18.6 8.7 22.6 C7.9 26 4.9 25.6 4.4 22 Z"
            fill={h}
          />
          <Path
            d="M9.4 8.4 Q17.4 4.6 25.4 5 M31.4 6 Q38.4 8.4 41.9 12.4"
            fill="none"
            stroke={shade(h, 0.34)}
            strokeWidth={1.1}
            strokeLinecap="round"
            opacity={0.5}
          />
        </>
      )}
    </>
  );
};

export const HairBraids: React.FC<PartProps> = ({ colors, layer }) => {
  const h = colors.hair;
  const braid = (x: number, key: string) => (
    <G key={key}>
      <Dome
        d={`M${x - 2.6} 15 Q${x - 3.6} 30 ${x - 2.2} 43 Q${x} 45.4 ${x + 2.2} 43 Q${x + 3.6} 30 ${x + 2.6} 15 Z`}
        fill={shade(h, -0.12)}
      />
      {[0, 1, 2, 3, 4].map((i) => (
        <Path
          key={i}
          d={`M${x - 2.6} ${19 + i * 5.4} Q${x} ${21 + i * 5.4} ${x + 2.6} ${19 + i * 5.4}`}
          fill="none"
          stroke={shade(h, -0.42)}
          strokeWidth={0.9}
          strokeLinecap="round"
          opacity={0.95}
        />
      ))}
    </G>
  );
  return (
    <>
      {layer !== "front" && (
        <>
          {braid(4.6, "l")}
          {braid(44.75, "r")}
        </>
      )}
      {layer !== "back" && (
        <>
          <Dome
            d="M5.4 21 C4.4 8 11.4 3.4 24.675 3.4 C37.95 3.4 44.95 8 43.95 21 Q40 14 24.675 14 Q9.4 14 5.4 21 Z"
            fill={h}
          />
          <Path d="M24.675 4 V13.6" fill="none" stroke={shade(h, -0.4)} strokeWidth={1} opacity={0.85} />
        </>
      )}
    </>
  );
};

export const HairPonytail: React.FC<PartProps> = ({ colors, layer }) => {
  const h = colors.hair;
  return (
    <>
      {layer !== "front" && (
        <>
          <Dome
            d="M41.35 15.4 Q47.75 17.4 47.35 26 Q46.95 35.4 43.35 43 Q41.35 46 39.35 43.6 Q43.35 34.4 43.75 26 Q43.95 20 39.75 17.4 Z"
            fill={shade(h, -0.12)}
          />
          <Path
            d="M43 21.4 Q45.6 26 45.2 32 Q44.8 38 42.6 42.4"
            fill="none"
            stroke={shade(h, 0.26)}
            strokeWidth={1}
            strokeLinecap="round"
            opacity={0.55}
          />
        </>
      )}
      {layer !== "back" && (
        <>
          <Dome
            d="M5 21.4 C4 8.4 11.4 3.4 24.675 3.4 C39.95 3.4 45.95 9.4 44.35 20.4 Q40.4 13.4 24.675 13.4 Q9.4 13.4 5 21.4 Z"
            fill={h}
          />
          <Path
            d="M9.4 17.4 Q16.4 9.4 26.4 8.4 Q35.4 7.6 41.4 12.4"
            fill="none"
            stroke={shade(h, 0.3)}
            strokeWidth={1.1}
            strokeLinecap="round"
            opacity={0.55}
          />
        </>
      )}
    </>
  );
};

export const HairSpaceBuns: React.FC<PartProps> = ({ colors, layer }) => {
  const h = colors.hair;
  return (
    <>
      {layer !== "front" && (
        <>
          <Dome d="M6.6 15.4 Q1.4 15.4 1.4 21.4 Q1.4 27.4 6.6 27.4 Q11.4 27.4 11.4 21.4 Q11.4 15.4 6.6 15.4 Z" fill={shade(h, 0.04)} />
          <Dome d="M42.75 15.4 Q47.95 15.4 47.95 21.4 Q47.95 27.4 42.75 27.4 Q37.95 27.4 37.95 21.4 Q37.95 15.4 42.75 15.4 Z" fill={shade(h, 0.04)} />
          <Path
            d="M3.6 19.4 Q6.6 17.4 9.6 19.4 M39.75 19.4 Q42.75 17.4 45.75 19.4"
            fill="none"
            stroke={shade(h, -0.36)}
            strokeWidth={0.9}
            strokeLinecap="round"
            opacity={0.8}
          />
        </>
      )}
      {layer !== "back" && (
        <>
          <Dome
            d="M5.4 20.4 C4.4 8 11.4 3.4 24.675 3.4 C37.95 3.4 44.95 8 43.95 20.4 Q40 13.4 24.675 13.4 Q9.4 13.4 5.4 20.4 Z"
            fill={h}
          />
          <Path d="M24.675 4 V13" fill="none" stroke={shade(h, -0.36)} strokeWidth={1} opacity={0.7} />
        </>
      )}
    </>
  );
};

export const HairBob: React.FC<PartProps> = ({ colors, layer }) => {
  const h = colors.hair;
  return (
    <>
      {layer !== "front" && (
        <>
          <Dome d="M6.4 16 Q2.4 20 2.6 27 Q2.8 33 6.4 36 L13.4 34 Q10 27 10.6 16 Z" fill={shade(h, -0.12)} />
          <Dome d="M42.95 16 Q46.95 20 46.75 27 Q46.55 33 42.95 36 L35.95 34 Q39.35 27 38.75 16 Z" fill={shade(h, -0.12)} />
        </>
      )}
      {layer !== "back" && (
        <>
          <Dome
            d="M5.4 22 C4.4 8.4 11.4 3.4 24.675 3.4 C37.95 3.4 44.95 8.4 43.95 22 Q42 15 33.4 13.6 Q29 12.9 24.675 12.9 Q20.35 12.9 16 13.6 Q7.4 15 5.4 22 Z"
            fill={h}
          />
          <Path
            d="M9.4 18.4 Q14.4 10.4 22.4 8.6"
            fill="none"
            stroke={shade(h, 0.3)}
            strokeWidth={1.1}
            strokeLinecap="round"
            opacity={0.5}
          />
        </>
      )}
    </>
  );
};

export const HairPigtails: React.FC<PartProps> = ({ colors, layer }) => {
  const h = colors.hair;
  return (
    <>
      {layer !== "front" && (
        <>
          <Dome
            d="M7.4 17.4 Q1.4 21.4 1.6 30 Q1.8 37.4 5.4 41.4 Q8.4 43.4 10.4 40.4 Q7.4 34.4 8 28 Q8.4 22.4 11.4 19.4 Z"
            fill={shade(h, -0.1)}
          />
          <Dome
            d="M41.95 17.4 Q47.95 21.4 47.75 30 Q47.55 37.4 43.95 41.4 Q40.95 43.4 38.95 40.4 Q41.95 34.4 41.35 28 Q40.95 22.4 37.95 19.4 Z"
            fill={shade(h, -0.1)}
          />
          <Path
            d="M4.4 24.4 Q3 31.4 4.6 38 M44.95 24.4 Q46.35 31.4 44.75 38"
            fill="none"
            stroke={shade(h, 0.24)}
            strokeWidth={0.9}
            strokeLinecap="round"
            opacity={0.55}
          />
        </>
      )}
      {layer !== "back" && (
        <>
          <Dome
            d="M5.4 20.4 C4.4 8 11.4 3.4 24.675 3.4 C37.95 3.4 44.95 8 43.95 20.4 Q40 13.4 24.675 13.4 Q9.4 13.4 5.4 20.4 Z"
            fill={h}
          />
          <Path d="M24.675 4 V13" fill="none" stroke={shade(h, -0.36)} strokeWidth={1} opacity={0.75} />
        </>
      )}
    </>
  );
};

// ── Expressions, second wave ─────────────────────────────────────────────────

/** Confident: rounder eyes, raised brows, a broad closed-lipped smile. */
export const ProudFace: React.FC<PartProps> = () => (
  <>
    <Ellipse cx={16} cy={22.4} rx={3.1} ry={3.1} fill="#FFFFFF" />
    <Ellipse cx={16} cy={22.4} rx={3.1} ry={3.1} fill="none" stroke={INK} strokeWidth={0.6} />
    <Circle cx={16.4} cy={23} r={1.9} fill={IRIS} />
    <Circle cx={16.4} cy={23} r={1.35} fill="#0B0A10" />
    <Circle cx={15.8} cy={22.4} r={0.55} fill="#FFFFFF" />
    <Ellipse cx={32} cy={22.4} rx={3.1} ry={3.1} fill="#FFFFFF" />
    <Ellipse cx={32} cy={22.4} rx={3.1} ry={3.1} fill="none" stroke={INK} strokeWidth={0.6} />
    <Circle cx={31.6} cy={23} r={1.9} fill={IRIS} />
    <Circle cx={31.6} cy={23} r={1.35} fill="#0B0A10" />
    <Circle cx={31} cy={22.4} r={0.55} fill="#FFFFFF" />
    <Path
      d="M12.4 17.6 Q16 16.2 19.6 17.4 M28.4 17.4 Q32 16.2 35.6 17.6"
      fill="none"
      stroke={INK}
      strokeWidth={1.2}
      strokeLinecap="round"
    />
    <Path d="M18.6 30 Q24.675 31.2 30.75 30 Q29.4 34.6 24.675 35 Q19.95 34.6 18.6 30 Z" fill={INK} />
    <Path d="M19.4 30.4 Q24.675 31.4 29.95 30.4 Q29.6 32 24.675 32.3 Q19.75 32 19.4 30.4 Z" fill="#FFFFFF" />
  </>
);

/** Laughing: eyes squeezed shut, mouth wide, tongue showing. */
export const LaughFace: React.FC<PartProps> = () => (
  <>
    <Path
      d="M12.9 23.4 Q16 19.4 19.1 23.4 M28.9 23.4 Q32 19.4 35.1 23.4"
      fill="none"
      stroke={INK}
      strokeWidth={1.4}
      strokeLinecap="round"
    />
    <Path d="M17.4 29.4 Q24.675 30.6 31.95 29.4 Q31.4 37.4 24.675 38 Q17.95 37.4 17.4 29.4 Z" fill={INK} />
    <Path d="M18.4 29.8 Q24.675 31 30.95 29.8 Q30.7 32.2 24.675 32.6 Q18.65 32.2 18.4 29.8 Z" fill="#FFFFFF" />
    <Ellipse cx={24.675} cy={36.4} rx={2.8} ry={1.8} fill="#E2707E" />
  </>
);

/**
 * Mid-speech: the one expression this product has a reason to own. An open
 * round mouth mid-vowel, with two arcs beside it for the sound leaving.
 */
export const SpeakingFace: React.FC<PartProps> = () => (
  <>
    <AvatarEye cx={16} irisDx={0.55} />
    <AvatarEye cx={32} irisDx={-0.55} />
    <Ellipse cx={24.675} cy={32} rx={3.6} ry={4.4} fill={INK} />
    <Ellipse cx={24.675} cy={34} rx={2.2} ry={2.2} fill="#E2707E" />
    <Path
      d="M36.4 26 Q39.4 27.4 39.4 30.4 M39.4 22.4 Q43.4 25.4 43.4 30.4"
      fill="none"
      stroke="#FFFFFF"
      strokeWidth={1.1}
      strokeLinecap="round"
      opacity={0.5}
    />
  </>
);

// ── Phase 1: the rest of the tailoring set ───────────────────────────────────
//
// Six collars, nine hats and six pairs of glasses, drawn and reviewed alongside
// the four collars that shipped first. Same two constraints as everything else
// worn on the head: the tile crops anything above the crown, so hats are
// deliberately low; and no hat edge may cross y≈18.8 at the eye columns.

/** Polo — soft knit collar over a two-button placket. */
export const PoloCollar: React.FC<PartProps> = ({ colors, layer }) => {
  const c = colors.collar;
  const btn = trimOf(c);
  return (
    <>
      {layer !== "front" && <Dome d={COLLAR_BACK} fill={shade(c, -0.26)} />}
      {layer !== "back" && (
        <>
          <CollarBase c={c} />
          <Dome d="M22.2 41.4 L27.15 41.4 L27.8 56 L21.55 56 Z" fill={shade(c, -0.06)} />
          <Dome d="M6.4 35.2 Q14 39.6 23.6 41.6 L20.4 45.8 Q11.6 43.6 5.6 38.6 Z" fill={shade(c, 0.09)} />
          <Dome d="M42.95 35.2 Q35.35 39.6 25.75 41.6 L28.95 45.8 Q37.75 43.6 43.75 38.6 Z" fill={shade(c, 0.09)} />
          <Circle cx={CX} cy={45.6} r={0.85} fill={btn} stroke={INK} strokeWidth={0.3} />
          <Circle cx={CX} cy={49.4} r={0.85} fill={btn} stroke={INK} strokeWidth={0.3} />
          <Path
            d="M8.4 37.6 Q15.4 41.4 22.4 43.2 M40.95 37.6 Q33.95 41.4 26.95 43.2"
            fill="none"
            stroke={shade(c, -0.16)}
            strokeWidth={0.5}
            strokeLinecap="round"
            opacity={0.5}
          />
        </>
      )}
    </>
  );
};

/** Johnny — a narrow knit V with no buttons. */
export const JohnnyCollar: React.FC<PartProps> = ({ colors, layer }) => {
  const c = colors.collar;
  return (
    <>
      {layer !== "front" && <Dome d={COLLAR_BACK} fill={shade(c, -0.26)} />}
      {layer !== "back" && (
        <>
          <Dome d={GARMENT} fill={c} />
          <Dome
            d="M6.6 33.4 Q14.4 39.4 24.675 44.6 Q34.95 39.4 42.75 33.4 L44.75 37.4 Q35.35 43.6 24.675 49.4 Q14 43.6 4.6 37.4 Z"
            fill={shade(c, 0.1)}
          />
          <Path
            d="M8.4 35.4 Q15.4 40.6 24.675 45.4 Q33.95 40.6 40.95 35.4"
            fill="none"
            stroke={shade(c, -0.24)}
            strokeWidth={0.6}
            strokeLinecap="round"
            opacity={0.6}
          />
          <Dome
            d="M-2 56 L-2 44.4 Q10 48.6 24.675 51 Q39.35 48.6 51.35 44.4 L51.35 56 Z"
            fill={shade(c, -0.06)}
          />
        </>
      )}
    </>
  );
};

/** Medici — the tall fan standing behind the neck. The only collar whose
 *  drama lives in the BACK layer, in the slivers beside the head. */
export const MediciCollar: React.FC<PartProps> = ({ colors, layer }) => {
  const c = colors.collar;
  return (
    <>
      {layer !== "front" && (
        <>
          <Dome d={COLLAR_BACK} fill={shade(c, -0.3)} />
          <Dome d="M-2 46 Q-4 17 8.6 10.2 Q13.4 20 14.6 34 Q6 38 0.4 46 Z" fill={shade(c, 0.06)} />
          <Dome d="M51.35 46 Q53.35 17 40.75 10.2 Q35.95 20 34.75 34 Q43.35 38 48.95 46 Z" fill={shade(c, 0.06)} />
        </>
      )}
      {layer !== "back" && (
        <>
          <Dome d={GARMENT} fill={c} />
          <Dome
            d="M7.4 33.4 Q15.4 39.4 24.675 45.6 Q33.95 39.4 41.95 33.4 L43.35 38 Q34.35 44.2 24.675 50.4 Q15 44.2 6 38 Z"
            fill={shade(c, 0.12)}
          />
          <Path
            d="M10.4 35.4 Q16.4 40.2 24.675 45.4 M38.95 35.4 Q32.95 40.2 24.675 45.4"
            fill="none"
            stroke={shade(c, -0.26)}
            strokeWidth={0.55}
            strokeLinecap="round"
            opacity={0.55}
          />
        </>
      )}
    </>
  );
};

/** Puritan — one wide flat collar lying over the shoulders. */
export const PuritanCollar: React.FC<PartProps> = ({ colors, layer }) => {
  const c = colors.collar;
  return (
    <>
      {layer !== "front" && <Dome d={COLLAR_BACK} fill={shade(c, -0.24)} />}
      {layer !== "back" && (
        <>
          <Dome d={GARMENT} fill={c} />
          <Dome
            d="M2.6 31.4 Q13.4 38.4 24.675 40.6 Q35.95 38.4 46.75 31.4 Q48.35 38.4 45.35 44.6 Q35.35 48.6 24.675 48.6 Q14 48.6 4 44.6 Q1 38.4 2.6 31.4 Z"
            fill={shade(c, 0.12)}
          />
          <Path
            d="M6.4 36.4 Q15.4 42.4 24.675 44.4 Q33.95 42.4 42.95 36.4"
            fill="none"
            stroke={shade(c, -0.2)}
            strokeWidth={0.6}
            strokeLinecap="round"
            opacity={0.5}
          />
          <Circle cx={CX} cy={45.6} r={0.9} fill={trimOf(c)} stroke={INK} strokeWidth={0.3} />
        </>
      )}
    </>
  );
};

/** Button-down — point collar with its tips buttoned to the shirt. */
export const ButtonDownCollar: React.FC<PartProps> = ({ colors, layer }) => {
  const c = colors.collar;
  const leaf = shade(c, 0.08);
  const btn = trimOf(c);
  return (
    <>
      {layer !== "front" && <Dome d={COLLAR_BACK} fill={shade(c, -0.28)} />}
      {layer !== "back" && (
        <>
          <CollarBase c={c} />
          <Dome d="M22.2 41.4 L27.15 41.4 L27.8 56 L21.55 56 Z" fill={shade(c, -0.05)} />
          <Dome d="M5 34.4 Q13.4 39.4 24.675 41.4 L18.4 46.2 Q10.4 43.4 3.8 37.4 Z" fill={leaf} />
          <Dome d="M44.35 34.4 Q35.95 39.4 24.675 41.4 L30.95 46.2 Q38.95 43.4 45.55 37.4 Z" fill={leaf} />
          <FoldShade c={c} />
          <Circle cx={18.4} cy={45.8} r={0.85} fill={btn} stroke={INK} strokeWidth={0.3} />
          <Circle cx={30.95} cy={45.8} r={0.85} fill={btn} stroke={INK} strokeWidth={0.3} />
        </>
      )}
    </>
  );
};

/** Pin collar — rounded leaves held together by a bar across the throat. */
export const PinCollar: React.FC<PartProps> = ({ colors, layer }) => {
  const c = colors.collar;
  const leaf = shade(c, 0.08);
  return (
    <>
      {layer !== "front" && <Dome d={COLLAR_BACK} fill={shade(c, -0.28)} />}
      {layer !== "back" && (
        <>
          <CollarBase c={c} />
          <Dome d="M22.2 41.4 L27.15 41.4 L27.8 56 L21.55 56 Z" fill={shade(c, -0.05)} />
          <Dome d="M5 34.4 Q13.4 39.4 23.4 41.4 Q22.6 46.4 15.6 47.2 Q7.6 45.4 3.8 37.4 Z" fill={leaf} />
          <Dome d="M44.35 34.4 Q35.95 39.4 25.95 41.4 Q26.75 46.4 33.75 47.2 Q41.75 45.4 45.55 37.4 Z" fill={leaf} />
          <FoldShade c={c} />
          <Path d="M20.4 44 L28.95 44" fill="none" stroke={GOLD} strokeWidth={1.4} strokeLinecap="round" />
          <Circle cx={20.4} cy={44} r={0.9} fill={GOLD} stroke={INK} strokeWidth={0.3} />
          <Circle cx={28.95} cy={44} r={0.9} fill={GOLD} stroke={INK} strokeWidth={0.3} />
        </>
      )}
    </>
  );
};

/** Beret — a soft disc slumped to one side, with its nub. */
export const Beret: React.FC<PartProps> = () => (
  <>
    <Dome
      d="M4.6 15.4 C4 7.4 9.6 2.6 24.675 2.6 C40.4 2.6 46.8 7 45.6 13 C44.8 17 38 15 24.675 15 C14 15 6 18.2 4.6 15.4 Z"
      fill="#B4443E"
    />
    <Dome d="M5.6 14 Q24.675 11.4 44.2 12.8 L44 16 Q24.675 13.8 5.8 17.2 Z" fill="#8E332E" />
    <Circle cx={31.6} cy={3.2} r={1.7} fill="#8E332E" stroke={INK} strokeWidth={0.7} />
    <Path d="M9.4 7.4 Q16.4 4.4 25.6 4.6" fill="none" stroke="#D9736C" strokeWidth={0.9} strokeLinecap="round" opacity={0.5} />
  </>
);

/** Witch hat — a wide-based cone, because a narrow one loses its point to the
 *  tile crop entirely. Band and buckle sit where the brim meets the crown. */
export const WitchHat: React.FC<PartProps> = () => (
  <>
    <Dome d="M7 13.6 C9.6 6.6 16.4 1.4 25.4 0.6 C31.6 2.6 37.2 6.8 42 13.6 Z" fill="#5B3E86" />
    <Dome d="M11.4 9.4 Q24.675 7 34.35 9.6 L35.35 12.8 Q24.675 10.2 12.4 12.6 Z" fill="#2E2140" />
    <Rect x={22.6} y={9} width={4.2} height={3.2} rx={0.5} fill={GOLD} stroke={INK} strokeWidth={0.5} />
    <Dome
      d="M1.4 15 C0.6 11.4 4.4 10.6 9.4 11.8 C15.4 13.2 33.95 13.2 39.95 11.8 C44.95 10.6 48.75 11.4 47.95 15 C42.2 18.4 24.675 18.6 24.675 18.6 C7.15 18.4 1.4 15 1.4 15 Z"
      fill="#5B3E86"
    />
    <Path d="M6 14.6 Q24.675 17 43.35 14.6" fill="none" stroke="#3D2A5C" strokeWidth={0.7} strokeLinecap="round" opacity={0.5} />
  </>
);

/** Sombrero — the widest brim in the set; it runs past the tile on both sides. */
export const Sombrero: React.FC<PartProps> = () => (
  <>
    <Dome d="M8.4 13 C11.4 7.4 17.4 2.6 24.675 1.2 C31.95 2.6 37.95 7.4 40.95 13 Z" fill="#E3B457" />
    <Dome d="M11.4 9 Q24.675 6.6 37.95 9 L38.75 12 Q24.675 9.6 10.6 12 Z" fill="#8E5B2A" />
    <Dome
      d="M-1 15.2 C-2 11.2 3 10.2 9 11.6 C15 13 34.35 13 40.35 11.6 C46.35 10.2 51.35 11.2 50.35 15.2 C44 18.2 24.675 18.4 24.675 18.4 C5.35 18.2 -1 15.2 -1 15.2 Z"
      fill="#E3B457"
    />
    <Path d="M2.6 14.4 Q24.675 17.2 46.75 14.4" fill="none" stroke="#B8892F" strokeWidth={0.8} strokeLinecap="round" opacity={0.7} />
    <Path
      d="M4.6 16.2 L7.4 14.4 M11.4 17 L14.4 15 M21.4 17.6 L24.4 15.6 M31.4 17.4 L34.4 15.4 M39.4 16.4 L42.4 14.4"
      fill="none"
      stroke="#B8892F"
      strokeWidth={0.7}
      strokeLinecap="round"
      opacity={0.55}
    />
  </>
);

/** Deerstalker — plaid crown, twin brims, and the ear flaps that make it one. */
export const Deerstalker: React.FC<PartProps> = () => (
  <>
    <Dome d="M5.6 15 C4.8 6.4 9 3 24.675 3 C40.35 3 44.55 6.4 43.75 15 C34 12.8 15 12.8 5.6 15 Z" fill="#8A7A5E" />
    <Path
      d="M13.4 3.4 L13.4 14 M24.675 2.8 L24.675 13.4 M35.95 3.4 L35.95 14"
      fill="none"
      stroke="#5E5240"
      strokeWidth={0.6}
      strokeLinecap="round"
      opacity={0.6}
    />
    <Path
      d="M8 6.6 Q24.675 4.4 41.35 6.6 M6.6 10.4 Q24.675 8 42.75 10.4"
      fill="none"
      stroke="#5E5240"
      strokeWidth={0.6}
      strokeLinecap="round"
      opacity={0.6}
    />
    <Dome d="M4.4 14.2 C1.4 14 0.4 17.6 2 21.6 C3.2 24.4 7 24.4 8.2 21.6 C9.4 18.8 8.4 14.6 4.4 14.2 Z" fill="#7A6B52" />
    <Dome d="M44.95 14.2 C47.95 14 48.95 17.6 47.35 21.6 C46.15 24.4 42.35 24.4 41.15 21.6 C39.95 18.8 40.95 14.6 44.95 14.2 Z" fill="#7A6B52" />
    <Dome d="M6.4 14.6 Q24.675 12.2 43 14.6 Q41.2 17.8 24.675 17.2 Q8.2 17.8 6.4 14.6 Z" fill="#7A6B52" />
  </>
);

/** Graduation cap — the mortarboard reads even cropped, because the board is
 *  a diamond rather than a dome. */
export const GraduationCap: React.FC<PartProps> = () => (
  <>
    <Dome d="M10.4 11.6 C10.4 8 38.95 8 38.95 11.6 L38.95 16.4 C38.95 18.6 10.4 18.6 10.4 16.4 Z" fill="#2B2733" />
    <Dome d="M2.6 11.2 L24.675 4.8 L46.75 11.2 L24.675 17.6 Z" fill="#332F3D" />
    <Path d="M24.675 11.2 L41.35 12.6 L41.35 19.6" fill="none" stroke={GOLD} strokeWidth={1} strokeLinecap="round" />
    <Circle cx={41.35} cy={20.6} r={1.5} fill={GOLD} stroke={INK} strokeWidth={0.4} />
    <Circle cx={CX} cy={11.2} r={1.1} fill={GOLD} stroke={INK} strokeWidth={0.4} />
  </>
);

/** Chef toque — the puff is capped at the tile's ceiling; a true tall toque
 *  would simply be sliced off. */
export const ChefToque: React.FC<PartProps> = () => (
  <>
    <Dome
      d="M7.4 13.6 C2.6 8.4 6.4 1.4 13.4 3 C15 -1.6 22.4 -2.4 25.4 1 C29.4 -2 37.4 0.4 37 5 C43.4 5.4 45.4 11.6 42.4 14.4 C34 12.4 15 12.4 7.4 13.6 Z"
      fill="#F4F1EA"
    />
    <Dome d="M5.8 13.2 Q24.675 10.6 43.55 13.2 L43.55 17.4 Q24.675 14.8 5.8 17.4 Z" fill="#E2DDD2" />
    <Path
      d="M11.4 8.4 Q13.4 4.4 18.4 3.4 M30.4 3 Q35.4 4 37.4 8"
      fill="none"
      stroke="#D2CCBF"
      strokeWidth={0.8}
      strokeLinecap="round"
      opacity={0.8}
    />
  </>
);

/** Sailor cap — the upturned dixie, with its anchor tab. */
export const SailorCap: React.FC<PartProps> = () => (
  <>
    <Dome d="M8.4 12 C8.4 6.4 12.6 3.8 24.675 3.8 C36.75 3.8 40.95 6.4 40.95 12 C34 10.2 15 10.2 8.4 12 Z" fill="#F4F1EA" />
    <Dome
      d="M5.6 15.4 C5.6 10.4 10 9.2 24.675 9.2 C39.35 9.2 43.75 10.4 43.75 15.4 C43.75 17.8 34 18.4 24.675 18.4 C15.35 18.4 5.6 17.8 5.6 15.4 Z"
      fill="#F4F1EA"
    />
    <Path d="M8.4 14 Q24.675 11.8 40.95 14" fill="none" stroke="#C9C3B6" strokeWidth={0.7} strokeLinecap="round" opacity={0.7} />
    <Dome d="M23.2 12.6 L26.15 12.6 L26.15 15.6 Q24.675 17.2 23.2 15.6 Z" fill="#2E5C8A" />
  </>
);

/** Police cap — peaked, with a gold shield. */
export const PoliceCap: React.FC<PartProps> = () => (
  <>
    <Dome d="M6.6 13.4 C6.6 6.2 11 3.2 24.675 3.2 C38.35 3.2 42.75 6.2 42.75 13.4 C34 11.4 15 11.4 6.6 13.4 Z" fill="#2E3A55" />
    <Dome d="M6.4 12.8 Q24.675 10.6 42.95 12.8 L42.95 15.8 Q24.675 13.6 6.4 15.8 Z" fill="#1E2740" />
    <Dome d="M4.4 15.8 Q24.675 13.2 44.95 15.8 Q43 18.6 24.675 18 Q6.35 18.6 4.4 15.8 Z" fill="#161C2E" />
    <Dome d="M22.4 5.8 L26.95 5.8 L26.95 9 Q24.675 10.8 22.4 9 Z" fill={GOLD} />
  </>
);

/** Aviator cap — leather, ear flaps, goggles pushed up onto the crown. */
export const AviatorCap: React.FC<PartProps> = () => (
  <>
    <Dome d="M5.6 16.4 C4.8 6.8 9 3.2 24.675 3.2 C40.35 3.2 44.55 6.8 43.75 16.4 C34 14.2 15 14.2 5.6 16.4 Z" fill="#6B4A32" />
    <Dome d="M4.2 15.6 C1.6 15.6 0.8 19 2.4 22.8 C3.6 25.4 7 25.4 8.2 22.8 C9.4 20 8.6 16 4.2 15.6 Z" fill="#5A3D28" />
    <Dome d="M45.15 15.6 C47.75 15.6 48.55 19 46.95 22.8 C45.75 25.4 42.35 25.4 41.15 22.8 C39.95 20 40.75 16 45.15 15.6 Z" fill="#5A3D28" />
    <Path d="M5.6 12.4 Q24.675 9.8 43.75 12.4" fill="none" stroke="#4A3221" strokeWidth={0.9} strokeLinecap="round" opacity={0.7} />
    <Circle cx={16} cy={8.4} r={3.9} fill="#2A2530" />
    <Circle cx={33.35} cy={8.4} r={3.9} fill="#2A2530" />
    <Circle cx={16} cy={8.4} r={3.9} fill="none" stroke="#C9A05A" strokeWidth={1.1} />
    <Circle cx={33.35} cy={8.4} r={3.9} fill="none" stroke="#C9A05A" strokeWidth={1.1} />
    <Path d="M19.9 8.4 L29.45 8.4" fill="none" stroke="#C9A05A" strokeWidth={1.2} strokeLinecap="round" />
    <Path
      d="M14.4 6.8 Q16 6 17.6 6.4 M31.75 6.8 Q33.35 6 34.95 6.4"
      fill="none"
      stroke="#FFFFFF"
      strokeWidth={0.8}
      strokeLinecap="round"
      opacity={0.45}
    />
  </>
);

/** Browline — the weight is all in the brow bar; the lower rim is a wire. */
export const Browline: React.FC<PartProps> = () => (
  <>
    <Path
      d="M9.8 18.6 Q16 16.6 22.2 18.6 M27.15 18.6 Q33.35 16.6 39.55 18.6"
      fill="none"
      stroke="#3A2E28"
      strokeWidth={3.2}
      strokeLinecap="round"
    />
    <Circle cx={16} cy={22.4} r={4.6} fill="#FFFFFF" opacity={0.1} />
    <Circle cx={32} cy={22.4} r={4.6} fill="#FFFFFF" opacity={0.1} />
    <Path d="M11.4 22.4 A4.6 4.6 0 0 0 20.6 22.4" fill="none" stroke="#B9A78F" strokeWidth={1} />
    <Path d="M27.4 22.4 A4.6 4.6 0 0 0 36.6 22.4" fill="none" stroke="#B9A78F" strokeWidth={1} />
    <Path d="M22.2 19 H27.15" fill="none" stroke="#3A2E28" strokeWidth={1.4} strokeLinecap="round" />
    <Path d="M9.8 19.2 L6 18.2 M39.55 19.2 L43.35 18.2" fill="none" stroke="#3A2E28" strokeWidth={1.4} strokeLinecap="round" />
    <Path d="M13 20.4 L15.4 19.8 M29 20.4 L31.4 19.8" fill="none" stroke="#FFFFFF" strokeWidth={0.8} strokeLinecap="round" opacity={0.5} />
  </>
);

/** Rimless — wire and glass only; the lenses are a tint, not a frame. */
export const Rimless: React.FC<PartProps> = () => (
  <>
    <Rect x={11.2} y={18.4} width={9.6} height={7.4} rx={1.6} fill="#CFE4F2" opacity={0.22} />
    <Rect x={27.2} y={18.4} width={9.6} height={7.4} rx={1.6} fill="#CFE4F2" opacity={0.22} />
    <Path d="M20.8 20.4 Q24.675 19 28.55 20.4" fill="none" stroke="#9AA6B4" strokeWidth={1} strokeLinecap="round" />
    <Path d="M11.2 20 L6.6 18.8 M36.8 20 L41.4 18.8" fill="none" stroke="#9AA6B4" strokeWidth={1} strokeLinecap="round" />
    <Path d="M11.6 25.6 L20.4 25.6 M28.6 25.6 L37.4 25.6" fill="none" stroke="#9AA6B4" strokeWidth={0.7} strokeLinecap="round" opacity={0.8} />
    <Path d="M13.4 20 L16.4 19.4 M29.4 20 L32.4 19.4" fill="none" stroke="#FFFFFF" strokeWidth={0.8} strokeLinecap="round" opacity={0.6} />
  </>
);

const hexLens = (cx: number) =>
  `M${cx - 5.2} 22 L${cx - 2.6} 17.8 L${cx + 2.6} 17.8 L${cx + 5.2} 22 L${cx + 2.6} 26.2 L${cx - 2.6} 26.2 Z`;

/** Hex frames — six-sided wire in a warm metal. */
export const HexFrames: React.FC<PartProps> = () => (
  <>
    <Path d={hexLens(16)} fill="#FFD9A0" opacity={0.3} />
    <Path d={hexLens(32)} fill="#FFD9A0" opacity={0.3} />
    <Path d={hexLens(16)} fill="none" stroke="#8A6A3A" strokeWidth={1.4} strokeLinejoin="round" />
    <Path d={hexLens(32)} fill="none" stroke="#8A6A3A" strokeWidth={1.4} strokeLinejoin="round" />
    <Path d="M21.2 22 H26.8" fill="none" stroke="#8A6A3A" strokeWidth={1.4} strokeLinecap="round" />
    <Path d="M10.8 21 L6.6 19.6 M37.2 21 L41.4 19.6" fill="none" stroke="#8A6A3A" strokeWidth={1.4} strokeLinecap="round" />
    <Path d="M13 20 L15.4 18.6 M29 20 L31.4 18.6" fill="none" stroke="#FFFFFF" strokeWidth={0.8} strokeLinecap="round" opacity={0.5} />
  </>
);

/** Pixel shades — an 8-bit bar. The one piece in the catalog drawn on a grid
 *  rather than a curve, which is the whole joke. */
export const PixelShades: React.FC<PartProps> = () => {
  const CELL = 2.6;
  const X0 = 8.4;
  const Y0 = 17.6;
  const GRID = [
    [1, 1, 1, 1, 0, 0, 1, 1, 1, 1],
    [1, 1, 1, 1, 0, 0, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  ];
  return (
    <>
      {GRID.flatMap((row, r) =>
        row.map((v, c) =>
          v ? (
            <Rect
              key={`${r}-${c}`}
              x={+(X0 + c * CELL * 1.32).toFixed(2)}
              y={+(Y0 + r * CELL).toFixed(2)}
              width={CELL * 1.28}
              height={CELL}
              fill={r === 2 ? "#1A1720" : "#23202B"}
            />
          ) : null,
        ),
      )}
    </>
  );
};

const LEOPARD_L = "M10 23.4 Q9.6 18.8 15.4 18.4 Q21 18.1 22.4 20.4 Q23 21.6 20.4 22.6 Q14.4 24.4 10 23.4 Z";
const LEOPARD_R = "M39.35 23.4 Q39.75 18.8 33.95 18.4 Q28.35 18.1 26.95 20.4 Q26.35 21.6 28.95 22.6 Q34.95 24.4 39.35 23.4 Z";

/** Leopard cat-eye — spotted frame, dark lens. */
export const LeopardCatEye: React.FC<PartProps> = () => (
  <>
    <Path d={LEOPARD_L} fill="#20222B" />
    <Path d={LEOPARD_R} fill="#20222B" />
    <Path d={LEOPARD_L} fill="none" stroke="#D9A93F" strokeWidth={2.2} strokeLinejoin="round" />
    <Path d={LEOPARD_R} fill="none" stroke="#D9A93F" strokeWidth={2.2} strokeLinejoin="round" />
    {[
      [12.4, 21.4],
      [16.4, 19.6],
      [19.4, 21.2],
      [14.4, 22.8],
      [36.95, 21.4],
      [32.95, 19.6],
      [29.95, 21.2],
      [34.95, 22.8],
    ].map(([x, y]) => (
      <Circle key={`${x}-${y}`} cx={x} cy={y} r={0.85} fill="#4A3520" />
    ))}
    <Path d="M22.4 20.6 Q24.675 19.4 26.95 20.6" fill="none" stroke="#D9A93F" strokeWidth={1.5} strokeLinecap="round" />
    <Path d="M9.9 20.6 L6 19.4 M39.45 20.6 L43.35 19.4" fill="none" stroke="#D9A93F" strokeWidth={1.5} strokeLinecap="round" />
  </>
);

/** Monocle — one lens and a chain. The only asymmetric eyewear in the set. */
export const Monocle: React.FC<PartProps> = () => (
  <>
    <Circle cx={32} cy={22} r={5.6} fill="#CFE4F2" opacity={0.2} />
    <Circle cx={32} cy={22} r={5.6} fill="none" stroke={GOLD} strokeWidth={1.5} />
    <Circle cx={32} cy={22} r={4.6} fill="none" stroke={GOLD} strokeWidth={0.5} />
    <Path d="M32 27.6 Q31.4 33 34.4 36.4" fill="none" stroke={GOLD} strokeWidth={0.9} strokeLinecap="round" opacity={0.9} />
    <Path d="M29.4 19.4 Q31 18.2 33 18.6" fill="none" stroke="#FFFFFF" strokeWidth={0.9} strokeLinecap="round" opacity={0.6} />
  </>
);
