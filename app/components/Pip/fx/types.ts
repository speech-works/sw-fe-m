/**
 * Effects around Pip (confetti, fire, snow, sparkles, light rays, props...), described as DATA.
 * The engine (./FxLayer.tsx) turns an effect into particles: native views moved by the graphics chip from one shared clock,
 * painted once, never repainted per frame. Effects are designed in ./library.ts.
 *
 * Units: effects are UNBOUNDED, drawn over the WHOLE SCREEN (PipStage puts their layers over the window, above other content).
 * Positions are fractions of the screen (x 0 = left edge, 1 = right edge; y 0 = top, 1 = bottom; values outside 0..1 start or end
 * off-screen). Pip's centre (the default origin) is wherever the screen places him. Speeds are screen heights per second,
 * gravity screen heights per s². Particle sizes are fractions of the screen WIDTH. Times are ms.
 */

import type { PipBeat } from "../Pip";

/** A particle drawing in a 100 x 100 box. A fill or stroke of "$c" takes the particle's palette colour; "$c2" a second one. */
export type FxShape = { paths: { d: string; fill?: string; stroke?: string; sw?: number; opacity?: number }[] };

export type FxEmitterKind =
  | "burst"   // all at once from `origin`, flying out within `spread` degrees (0 = right, -90 = up), slowing by `drag`, falling by `gravity`
  | "rain"    // spawn along the top of `area` over `stagger` ms and fall at `speed`, swaying by `sway` (snow, glitter, petals)
  | "rise"    // spawn along the bottom of `area` and float up at `speed`, swaying (hearts, bubbles, balloons, notes)
  | "twinkle" // appear at random spots in `area`, grow and shrink once (sparkles, stars)
  | "flicker" // stay at spots spread along `area`, flicker in size and brightness for their whole life (flames, candles)
  | "rays"    // one shape at `origin`, turning at `spin` deg/s, fading in and out (light rays, sunburst)
  | "ring"    // one shape at `origin` growing from small to `size` while fading (shockwave)
  | "arc"    // particles appear one after another along an arc around `origin` (radius `radius`, from `arc[0]` to `arc[1]` degrees,
             // over `stagger` ms), then grow, drift with `sway` and fade like twinkle: sweeping bands (a rainbow of light, a swirl)
  | "track"  // ONE prop that follows its own keyframes (`keys`): it walks, turns, grows, tips over, hides... For acting props
             // (a clock that rings, a sign held up, hands gripping a sheet). Offsets are from `origin` (default Pip's centre)
  | "pop";    // a prop springs in with overshoot, bobs gently, pops out at the end of its life (lightbulb, bubble, hat). One at `origin`,
             // or with `area` + `count` several at random spots in the area, spawned over `stagger` (sticker slaps)

export type FxEmitter = {
  kind: FxEmitterKind;
  shapes: string[];                 // shape ids from the library; each particle picks one
  colors?: string[];                // palette for "$c" (and "$c2" = the next colour)
  count?: number;                   // particles (default 1 for rays / ring / pop)
  at?: number;                      // start delay after the effect starts
  layer?: "back" | "front";         // behind Pip or in front (default front)
  origin?: [number, number];        // where it starts (default Pip's centre)
  area?: [number, number, number, number]; // x0, y0, x1, y1 spawn box for rain / rise / twinkle / flicker
  spread?: [number, number];        // burst direction range in degrees
  speed?: [number, number];         // stage heights per second
  gravity?: number;                 // stage heights per s² (positive = down)
  drag?: number;                    // how fast a burst slows (per second, 0 = never)
  size?: [number, number];          // fraction of stage width
  spin?: [number, number];          // degrees per second
  life?: [number, number];          // ms each particle lives
  stagger?: number;                 // ms over which particles are spawned
  sway?: number;                    // side-to-side swing, fraction of stage width
  swayHz?: number;                  // swings per second (default 0.6)
  flip?: boolean;                   // tumble like paper (scaleY flips over), for confetti
  arc?: [number, number];          // for "arc": start and end angle in degrees (0 = right, -90 = up)
  radius?: [number, number];       // for "arc": radius range, fraction of screen width (a range gives the band its thickness)
  tilt?: [number, number];         // start angle range in degrees (any kind): stickers that land a little crooked, e.g. [-14, 14]
  upright?: boolean;                // stays upright (no random start angle, no spin), with a gentle side-to-side wobble: hearts, balloons, notes, flames, letters
  fadeIn?: number;                  // ms (default 120)
  fadeOut?: number;                 // ms (default 300)
  opacity?: number;                 // peak opacity (default 1)
  keys?: FxKey[];                   // for "track": the prop's keyframes (its life = the last key's t)
};
/** A keyframe of a "track" prop, `t` ms after the prop starts (its `at`). x, y: offset from the origin in fractions of the screen
 *  WIDTH (both, so paths keep their shape); r degrees; s scale; o opacity. A value left out holds the key before's. `e` = the
 *  easing INTO this key: "io" (default) in-out, "out" fast then soft, "in" slow then fast, "back" overshoots and settles, "lin",
 *  "hold" (jumps at the key: for blinks, ticks, snaps). */
export type FxKey = { t: number; x?: number; y?: number; r?: number; s?: number; o?: number; e?: "io" | "out" | "in" | "back" | "lin" | "hold" };

/** A sound cue: a file from ./sfx.ts, at a time, at a volume (0..1). */
export type FxSound = { name: string; at: number; volume?: number };

export type FxEffect = {
  id: string;
  name: string;          // 2-4 words
  feel: string;          // one plain sentence
  emitters: FxEmitter[];
  sounds?: FxSound[];
  /** Pip's own reaction that plays with the effect (faces, body motions, hand moves; see PipBeat in ../Pip). */
  pip?: PipBeat[];
  /** The scene drawn inside Pip's blob while this effect is on (app/components/Pip/scenes.ts); none = his plain blob. */
  scene?: "snow" | "campfire" | "party" | "love";
  ms: number;            // until the last particle is gone
};
