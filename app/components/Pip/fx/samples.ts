/**
 * Sample moments at the new level (2026-11-28): each option is a whole moment, acted on its real screen, with its own drawn
 * props, background and sounds (an FxEffect: emitters + sounds + Pip's beats). Played by the Moments lab with PipStage.fire().
 *
 * Positions are written in the screen's own points (390 x 844, the screens the lab shows) and turned into screen fractions.
 * Track offsets (FxKey x, y) are fractions of the screen WIDTH.
 * Rules kept: nothing covers Pip's face or collar; props move (enter, act, leave), none stands still beside him.
 */
import type { FxEffect, FxEmitter } from "./types";
import { FXK, fxById } from "./library";
import { SAMPLES_B2A } from "./samples-b2a";
import { SAMPLES_B2B } from "./samples-b2b";

const W = 390, H = 844;
const at = (x: number, y: number): [number, number] => [x / W, y / H];
const LIME = "#DFFF2E", PINK = "#FF9BD8", GOLD = "#FFC530", SUN = "#FFD84A", OR = "#F76117", OR2 = "#FF7A1A", RED = "#FF2B2B";
const CREAM = "#FFF9E9", BLUE = "#1E7BFF", TEAL = "#2BB3A3", LILAC = "#C4B5FD", NIGHT = "#1B2A4A";
const PARTY = [RED, PINK, LIME, GOLD, BLUE, TEAL, OR];
type E = FxEmitter;

/** Hands gripping the sheet's top edge at y (pt), either side of Pip's centre x; they land at `t`, let go at `off`. */
const hands = (cx: number, y: number, t: number, off: number, spread = 50): E[] => (["grip-l", "grip-r"] as const).map((g, i) => ({
  kind: "track", shapes: [g], origin: at(cx + (i ? spread : -spread), y), size: [0.1, 0.1], at: t + i * 40,
  keys: [{ t: 0, y: -0.07, o: 0, s: 0.9 }, { t: 90, o: 1 }, { t: 200, y: 0, s: 1, e: "back" }, { t: off - t, y: 0 }, { t: off - t + 220, y: -0.06, o: 0, e: "in" }],
}));
/** Fast-forward: the sign zooms across and speed streaks fly past right to left. */
const fastForward = (t: number, y = 0.5): E[] => [
  ...[0.3, 0.38, 0.47, 0.55, 0.63, 0.72, 0.42, 0.6].map((yy, i): E => ({
    kind: "track", shapes: ["speed"], colors: [i % 2 ? CREAM : SUN], origin: [0.5, yy + (y - 0.5)], size: [0.42 + (i % 3) * 0.1, 0.5], at: t + i * 45, opacity: 0.85,
    keys: [{ t: 0, x: 1.0, o: 0 }, { t: 60, o: 0.9 }, { t: 380, x: -1.1, e: "lin" }],
  })),
  { kind: "track", shapes: ["ffwd-ink"], colors: [LIME], origin: [0.5, y], size: [0.34, 0.34], at: t + 60,
    keys: [{ t: 0, x: -0.75, s: 0.7 }, { t: 220, x: 0, s: 1.1, e: "out" }, { t: 320, s: 1, e: "io" }, { t: 560, x: 0.04 }, { t: 780, x: 0.85, s: 0.8, o: 0, e: "in" }] },
];
const sparks = (o: [number, number], t: number, colors = [GOLD, LIME, CREAM], n = 10): E => ({
  kind: "burst", shapes: ["sparkle", "glitter", "dot"], colors, origin: o, at: t, count: n, spread: [0, 360], speed: [0.25, 0.6], drag: 3, gravity: 0.1, size: [0.022, 0.045], life: [700, 1100], fadeOut: 400,
});
const twinkle = (area: [number, number, number, number], t: number, n: number, colors: string[], stagger = 1500, layer: "back" | "front" = "front"): E => ({
  kind: "twinkle", shapes: ["sparkle", "star", "sparkpair"], colors, area, count: n, at: t, stagger, size: [0.03, 0.06], life: [700, 1200], spin: [10, 40], layer,
});

// ─────────── Step done (Next): the step's last screen, Pip in the hero over the sheet ───────────
// Pip: centre x 274, top 140, size 218; the sheet's top edge y 322; title on the left (x 26-130, y 175-280); text below the edge.
const SD = { cx: 274, edge: 322 };
const stepDone: FxEffect[] = [
  { id: "sd-read-grip-zoom", name: "Reads, grips, zooms", ms: 2800,
    feel: "He reads the title, then the text, grips the sheet with both hands, and the screen fast-forwards to the next step.",
    emitters: [...hands(SD.cx, SD.edge, 1100, 2000), ...fastForward(1750, 0.52)],
    sounds: [{ name: "lab-grip-pat-2", at: 1150, volume: 0.6 }, { name: "lab-ff-zip-2", at: 1750, volume: 0.7 }],
    pip: [{ at: 0, look: [-1, -0.35], face: "curious" }, { at: 650, look: [-0.25, 1], face: "listening" }, { at: 1150, look: "off", face: "smile", body: "nod" },
      { at: 1750, body: "lean", face: "laugh", haptic: "light" }, { at: 2500, face: "calm" }] },
  { id: "sd-tick-it-off", name: "Ticks it off", ms: 3100,
    feel: "He reads, a pencil darts in and ticks the text with a green check, he looks proud, then fast-forward.",
    emitters: [
      ...hands(SD.cx, SD.edge, 950, 2200),
      { kind: "track", shapes: ["pencil"], origin: at(352, 392), size: [0.15, 0.15], at: 1100,
        keys: [{ t: 0, x: 0.18, y: 0.08, o: 0 }, { t: 160, x: 0, y: 0, o: 1, e: "out" }, { t: 240, r: -10, x: -0.02 }, { t: 320, r: 8, x: 0.01, y: -0.03 }, { t: 400, r: -6, x: 0.03, y: -0.06 },
          { t: 520, r: 0, x: 0.05, y: -0.08 }, { t: 760, x: 0.25, y: -0.18, o: 0, e: "in" }] },
      { kind: "track", shapes: ["check"], origin: at(338, 372), size: [0.13, 0.13], at: 1280,
        keys: [{ t: 0, s: 0.2, o: 0 }, { t: 60, o: 1 }, { t: 240, s: 1.2, e: "out" }, { t: 360, s: 1 }, { t: 1100, s: 1 }, { t: 1350, s: 0.6, o: 0, e: "in" }] },
      sparks(at(338, 372), 1450, [LIME, GOLD, CREAM], 8),
      ...fastForward(2250, 0.52),
    ],
    sounds: [{ name: "lab-grip-pat-2", at: 1000, volume: 0.5 }, { name: "lab-pencil-check-1", at: 1150, volume: 0.7 }, { name: "ding", at: 1450, volume: 0.5 }, { name: "lab-ff-zip-2", at: 2250, volume: 0.7 }],
    pip: [{ at: 0, look: [-1, -0.35], face: "curious" }, { at: 550, look: [-0.25, 1], face: "listening" }, { at: 1250, look: [0.7, 1], face: "curious" },
      { at: 1500, face: "proud", body: "nod", haptic: "light" }, { at: 2000, look: "off" }, { at: 2250, body: "lean", face: "laugh" }, { at: 2900, face: "calm" }] },
  { id: "sd-quick", name: "Quick grip and go", ms: 1400,
    feel: "Short, for every step: hands slap onto the sheet and the screen zips forward.",
    emitters: [...hands(SD.cx, SD.edge, 0, 700), ...fastForward(250, 0.52)],
    sounds: [{ name: "lab-grip-pat-2", at: 60, volume: 0.6 }, { name: "lab-ff-zip-2", at: 250, volume: 0.7 }],
    pip: [{ at: 0, face: "smile", look: [0.4, 0.6] }, { at: 250, body: "lean", face: "laugh", look: "off", haptic: "light" }, { at: 1100, face: "calm" }] },
];

// ─────────── Day done: "Day 1 done", Pip big in the middle of the orange screen ───────────
// Pip: centre x 194, top 331, size 441 (wider than the screen); his head top about y 380; the sheet's top edge y 700.
const DD = { cx: 194, head: 470 };
const flames = (t: number): E[] => [0, 1].flatMap((i): E[] => {
  const x0 = i ? 0.74 : -0.06, x1 = i ? 1.06 : 0.26;
  return [
    { kind: "flicker", layer: "back", shapes: ["flame"], colors: [RED, OR, OR2], count: 4, at: t + i * 90, area: [x0, 0.5, x1, 0.66], size: [0.34, 0.5], life: [2500, 2700], fadeIn: 300, fadeOut: 600 },
    { kind: "flicker", layer: "back", shapes: ["flame"], colors: [GOLD, SUN, OR2], count: 4, at: t + 140 + i * 90, area: [x0 + 0.03, 0.6, x1 - 0.03, 0.74], size: [0.22, 0.32], life: [2400, 2600], fadeIn: 300, fadeOut: 600 },
  ];
});
const dayDone: FxEffect[] = [
  { id: "dd-firestorm", name: "Firestorm", ms: 3300,
    feel: "Fwoosh: the screen flashes hot, a wall of flames roars up behind Pip and embers fly up the whole screen while he jumps.",
    emitters: [
      { kind: "track", layer: "back", shapes: ["flood"], colors: [SUN], origin: [0.5, 0.5], size: [2.4, 2.4], at: 150, keys: [{ t: 0, o: 0 }, { t: 140, o: 0.55, e: "out" }, { t: 700, o: 0.15 }, { t: 2600, o: 0 }] },
      { kind: "ring", layer: "back", shapes: ["dot"], colors: [GOLD], origin: at(DD.cx, DD.head), at: 180, size: [2.2, 2.2], life: [700, 700], opacity: 0.5 },
      ...flames(200),
      { kind: "rise", shapes: ["ember"], colors: [GOLD, OR2, SUN, RED], count: 34, at: 300, stagger: 2000, area: [0, 0.6, 1, 0.85], speed: [0.3, 0.55], gravity: -0.05, sway: 0.03, size: [0.018, 0.034], life: [1300, 1800], upright: true },
    ],
    sounds: [{ name: "lab-fire-whoosh-1", at: 150, volume: 0.8 }, { name: "lab-kids-yay-1", at: 450, volume: 0.7 }, { name: "sparkle", at: 1400, volume: 0.35 }],
    pip: [{ at: 0, body: "settle", face: "curious" }, { at: 250, body: "bighop", face: "laugh", haptic: "success" }, { at: 1300, body: "pop", face: "proud" }, { at: 2700, face: "smile" }] },
  { id: "dd-poppers", name: "Popper party", ms: 3300,
    feel: "Two party poppers slide up from the bottom corners, aim at Pip and fire confetti across the screen; he jumps between them.",
    emitters: [
      ...[0, 1].flatMap((i): E[] => {
        const side = i ? 1 : -1, ox = i ? 0.88 : 0.12, t = 200 + i * 260, rot = 35 * -side;
        return [
          { kind: "track", shapes: ["popper"], origin: [ox, 0.8], size: [0.26, 0.26], at: t - 200,
            keys: [{ t: 0, y: 0.25, r: rot * 0.6, o: 0 }, { t: 80, o: 1 }, { t: 260, y: -0.1, r: rot, e: "back" }, { t: 330, r: rot * 1.35, y: -0.08, e: "out" }, { t: 480, r: rot, y: -0.1 }, { t: 2300, y: -0.1 }, { t: 2650, y: 0.15, o: 0, e: "in" }] },
          { kind: "burst", shapes: ["rect", "strip", "tri", "squig"], colors: PARTY, flip: true, origin: [ox - side * 0.065, 0.71], at: t + 120, count: 46,
            spread: i ? [-148, -102] : [-78, -32], speed: [1.0, 2.1], drag: 1.7, gravity: 0.5, spin: [160, 520], size: [0.026, 0.048], life: [2000, 2500], fadeOut: 500 },
          { kind: "burst", shapes: ["streamer"], colors: PARTY, origin: [ox - side * 0.065, 0.71], at: t + 120, count: 4, spread: i ? [-135, -110] : [-70, -45], speed: [1.0, 1.6], drag: 1.6, gravity: 0.45, spin: [30, 120], size: [0.1, 0.15], life: [2000, 2400] },
        ];
      }),
    ],
    sounds: [{ name: "lab-confetti-pop-1", at: 320, volume: 0.8 }, { name: "lab-confetti-pop-2", at: 580, volume: 0.75 }, { name: "lab-party-horn-1", at: 900, volume: 0.7 }],
    pip: [{ at: 0, look: [-0.8, 0.7], face: "curious" }, { at: 330, look: [0.8, 0.7] }, { at: 600, look: "off", body: "bighop", face: "laugh", haptic: "success" }, { at: 1500, body: "sway", face: "proud" }, { at: 2800, face: "smile" }] },
  { id: "dd-medal", name: "Medal drop", ms: 3200,
    feel: "A gold medal drops in on its ribbon beside Pip and swings; golden rays turn slowly behind him; he looks up at it, proud.",
    emitters: [
      { kind: "rays", layer: "back", shapes: ["sunburst"], colors: [SUN], origin: at(DD.cx, DD.head), at: 250, size: [2.3, 2.3], spin: [22, 22], life: [2800, 2800], fadeIn: 500, fadeOut: 600, opacity: 0.55 },
      { kind: "track", shapes: ["medal"], origin: at(330, 300), size: [0.26, 0.26], at: 200,
        keys: [{ t: 0, y: -0.9 }, { t: 420, y: 0, e: "back" }, { t: 620, r: -14 }, { t: 820, r: 10 }, { t: 1020, r: -6 }, { t: 1220, r: 3 }, { t: 1400, r: 0 }, { t: 2500, y: 0, o: 1 }, { t: 2900, y: -0.9, e: "in" }] },
      sparks(at(330, 320), 640, [GOLD, SUN, CREAM], 14),
      twinkle([0.05, 0.15, 0.95, 0.55], 700, 14, [GOLD, SUN, CREAM], 1600),
    ],
    sounds: [{ name: "lab-medal-ding-1", at: 600, volume: 0.75 }, { name: "sparkle", at: 900, volume: 0.4 }, { name: "lab-kids-yay-2", at: 1100, volume: 0.6 }],
    pip: [{ at: 300, look: [0.75, -0.7], face: "curious" }, { at: 650, face: "proud", body: "pop", haptic: "success" }, { at: 1500, look: "off", body: "nod", face: "laugh" }, { at: 2700, face: "smile" }] },
];

// ─────────── Next day not open yet: "Day 2 opens in 9 hours", Pip top right over the sheet ───────────
// Pip: centre x 276, top 205, size 212; the sheet's top edge y 383; "Day 1 done" title on the left (y 285-305).
const ND = { edge: 383 };
const nextDay: FxEffect[] = [
  { id: "nd-alarm", name: "Sets the alarm", ms: 3600,
    feel: "A little alarm clock hops in along the sheet's edge; Pip looks at it, it gets wound, rings twice for tomorrow, and settles.",
    emitters: [
      { kind: "track", shapes: ["alarm"], origin: at(88, 190), size: [0.17, 0.17], at: 0,
        keys: [{ t: 0, y: -0.6, r: -20 }, { t: 420, y: 0, r: 0, e: "in" }, { t: 520, s: 1.12, y: 0.015 }, { t: 640, s: 0.96, y: -0.03, e: "out" }, { t: 760, s: 1, y: 0, e: "in" },
          { t: 1200, r: 0 }, { t: 1300, r: -5 }, { t: 1400, r: 5 }, { t: 1500, r: -5 }, { t: 1600, r: 0 },
          ...Array.from({ length: 10 }, (_, i) => ({ t: 2000 + i * 55, r: i % 2 ? 12 : -12, e: "lin" as const })), { t: 2600, r: 0 },
          { t: 3100, o: 1 }, { t: 3450, o: 0, y: 0.05 }] },
      { kind: "burst", shapes: ["asterisk", "sparkle"], colors: [GOLD, CREAM], origin: at(88, 160), at: 2000, count: 8, spread: [-160, -20], speed: [0.2, 0.4], drag: 3, size: [0.03, 0.05], life: [600, 800] },
    ],
    sounds: [{ name: "lab-clock-wind-1", at: 1200, volume: 0.7 }, { name: "lab-clock-tick-1", at: 1650, volume: 0.6 }, { name: "ding", at: 2000, volume: 0.45 }, { name: "ding", at: 2280, volume: 0.4 }],
    pip: [{ at: 300, look: [-1, -0.5], face: "curious" }, { at: 1250, face: "smile", body: "nod" }, { at: 2000, face: "laugh", haptic: "light" }, { at: 2650, look: "off", face: "warm", body: "nod" }] },
  { id: "nd-lights-out", name: "Lights out", ms: 4400,
    feel: "The sky over the hero turns night blue, a moon rises, stars blink on and z's drift up from Pip as he settles in for tomorrow.",
    emitters: [
      { kind: "track", layer: "back", shapes: ["flood"], colors: [NIGHT], origin: [0.5, (ND.edge - 234) / H], size: [1.2, 1.2], at: 0, keys: [{ t: 0, o: 0 }, { t: 600, o: 0.86 }, { t: 3600, o: 0.86 }, { t: 4300, o: 0 }] },
      { kind: "track", layer: "back", shapes: ["moon"], colors: [SUN], origin: at(70, 150), size: [0.16, 0.16], at: 300, keys: [{ t: 0, y: 0.25, o: 0 }, { t: 900, y: 0, o: 1, e: "out" }, { t: 3300, y: -0.02 }, { t: 3900, o: 0 }] },
      twinkle([0.03, 0.05, 0.97, 0.4], 500, 18, [CREAM, SUN, LILAC], 2600, "back"),
      ...[1400, 2300].flatMap(t => [0, 1, 2].map((i): E => ({ kind: "burst", shapes: ["zed"], colors: [LILAC, CREAM, LILAC], origin: at(300, 250), at: t + i * 300, count: 1,
        spread: [-60 + i * 6, -60 + i * 6], speed: [0.18 + i * 0.05, 0.18 + i * 0.05], drag: 1.1, gravity: -0.03, size: [0.05 + i * 0.025, 0.05 + i * 0.025], life: [1400, 1400], fadeIn: 200, fadeOut: 600, upright: true }))),
    ],
    sounds: [{ name: "lab-music-box-1", at: 200, volume: 0.6 }],
    pip: [{ at: 300, face: "warm" }, { at: 900, look: [-1, -0.8], face: "curious" }, { at: 1300, look: "off", face: "warm", body: "settle" }, { at: 2300, body: "nod" }, { at: 3600, face: "calm" }] },
  { id: "nd-calendar", name: "Tomorrow's page", ms: 3200,
    feel: "A calendar pops up showing 1; Pip tears the page off, it flies away, and 2 is underneath: see you tomorrow.",
    emitters: [
      { kind: "track", shapes: ["cal-2"], origin: at(92, 182), size: [0.24, 0.24], at: 0, keys: [{ t: 0, s: 0, y: 0.04 }, { t: 280, s: 1, y: 0, e: "back" }, { t: 2600, s: 1 }, { t: 2950, s: 0.2, o: 0, e: "in" }] },
      { kind: "track", shapes: ["cal-1"], origin: at(92, 182), size: [0.24, 0.24], at: 0,
        keys: [{ t: 0, s: 0, y: 0.04 }, { t: 280, s: 1, y: 0, e: "back" }, { t: 1050, s: 1, r: 0 }, { t: 1120, r: -6, y: -0.01 }, { t: 1500, x: -0.2, y: -0.35, r: -40, o: 0, e: "in" }] },
      sparks(at(130, 318), 1250, [LIME, GOLD, CREAM], 8),
    ],
    sounds: [{ name: "pop", at: 0, volume: 0.5 }, { name: "lab-page-flip-1", at: 1080, volume: 0.8 }, { name: "chime-up", at: 1300, volume: 0.45 }],
    pip: [{ at: 250, look: [-1, -0.5], face: "curious" }, { at: 1080, face: "laugh", body: "hop", haptic: "light" }, { at: 1700, look: "off", face: "warm", body: "nod" }, { at: 2900, face: "calm" }] },
];

// ═════════════ Batch 1 (2026-11-28): on the lines of the FX lab effects the founder liked ═════════════
const { depth, toss, fall, lift, sparks: fsparks, twinkles, shell } = FXK;
const HERO_DD = 0.83;   // Day done screen: the sheet's top edge (y 700 of 844); background effects end there
/** An FX lab effect, renamed for its moment, with its sounds and Pip's beats swapped. */
const fromLib = (id: string, over: Partial<FxEffect>): FxEffect => ({ ...fxById(id), ...over });
const night = (t: number, edge: number, peak = 0.82, end = 3400): E =>
  ({ kind: "track", layer: "back", shapes: ["flood"], colors: [NIGHT], origin: [0.5, edge / H / 2], size: [2.4, 2.4], at: t, keys: [{ t: 0, o: 0 }, { t: 500, o: peak }, { t: end - 600, o: peak }, { t: end, o: 0 }] });
// a flood square of side 2.4 x width centred at edge/2 reaches below the edge; backClip ends it at the sheet

const dayDone2: FxEffect[] = [
  fromLib("confetti-cannons", { id: "dd2-cannons", name: "Side cannons", ms: 3300,
    feel: "Two confetti cannons fire from the sides just above the sheet, one after the other; the paper crosses high over Pip and floats down.",
    emitters: [
      ...depth(toss({ origin: [-0.03, 0.8], spread: [-80, -55], speed: [1.6, 2.8], drag: 1.5, gravity: 0.55, life: [2200, 2800] }), 44),
      ...depth(toss({ at: 220, origin: [1.03, 0.8], spread: [-125, -100], speed: [1.6, 2.8], drag: 1.5, gravity: 0.55, life: [2200, 2800] }), 44),
      toss({ origin: [-0.03, 0.8], spread: [-76, -60], speed: [1.8, 2.6], drag: 1.5, gravity: 0.55, shapes: ["streamer"], count: 5, size: [0.09, 0.14], spin: [30, 120], flip: false, life: [2200, 2800] }),
      toss({ at: 220, origin: [1.03, 0.8], spread: [-120, -104], speed: [1.8, 2.6], drag: 1.5, gravity: 0.55, shapes: ["streamer"], count: 5, size: [0.09, 0.14], spin: [30, 120], flip: false, life: [2200, 2800] }),
      twinkle([0.05, 0.08, 0.95, 0.6], 700, 10, [GOLD, CREAM, LIME], 1400),
    ],
    sounds: [{ name: "lab-cannon-confetti-1", at: 0, volume: 0.85 }, { name: "lab-cannon-confetti-2", at: 220, volume: 0.8 }, { name: "lab-cheer-short-1", at: 600, volume: 0.6 }],
    pip: [{ at: 0, look: [-0.8, 0.4], face: "curious" }, { at: 230, look: [0.8, 0.4] }, { at: 480, look: "off", body: "bighop", face: "laugh", haptic: "success" }, { at: 1500, body: "sway", face: "proud" }, { at: 2900, face: "smile" }] }),
  { id: "dd2-balloons", name: "Balloon lift", ms: 3600,
    feel: "A bunch of balloons floats up past Pip from below the sheet, near ones big and fast, far ones small, while confetti pops out of him.",
    emitters: [
      // up both sides of Pip, never over his face or collar
      ...[[-0.02, 0.24], [0.76, 1.02]].flatMap(([x0, x1]) => depth({ kind: "rise", shapes: ["balloon"], colors: [RED, BLUE, GOLD, PINK, TEAL, LIME, OR2], upright: true, area: [x0, 0.6, x1, 0.82], speed: [0.32, 0.5], gravity: -0.05, sway: 0.02, swayHz: 0.45, size: [0.1, 0.16], life: [2400, 3000], stagger: 900, fadeIn: 200, fadeOut: 400 }, 12)),
      ...depth(toss({ at: 420, origin: at(194, 360), spread: [-160, -20] }), 40),
      twinkle([0.05, 0.05, 0.95, 0.4], 900, 10, [GOLD, CREAM, PINK], 1600),
    ],
    sounds: [{ name: "lab-balloon-release-1", at: 0, volume: 0.75 }, { name: "lab-cannon-confetti-1", at: 420, volume: 0.6 }, { name: "lab-party-horn-1", at: 700, volume: 0.6 }],
    pip: [{ at: 0, look: [0, -1], face: "curious" }, { at: 420, look: "off", body: "bighop", face: "laugh", haptic: "success" }, { at: 1400, body: "bounce", face: "proud" }, { at: 3100, face: "smile" }] },
  { id: "dd2-stars", name: "Star shower", ms: 3500,
    feel: "Golden rays open slowly behind Pip and fat stars in four colours rain down the whole screen, near ones big, far ones tiny, with a twinkle.",
    emitters: [
      { kind: "rays", layer: "back", shapes: ["sunburst"], colors: [SUN], origin: at(194, 470), at: 100, size: [2.6, 2.6], spin: [16, 16], life: [3200, 3200], fadeIn: 600, fadeOut: 700, opacity: 0.42 },
      ...depth(fall({ shapes: ["star", "star", "sparkle"], colors: [GOLD, LIME, PINK, SUN, CREAM], speed: [0.34, 0.52], gravity: 0.08, sway: 0.02, spin: [40, 160], size: [0.035, 0.065], life: [2200, 2600], stagger: 1100, flip: false }), 60),
      fsparks({ at: 200, origin: at(194, 470), count: 22, colors: [GOLD, SUN, CREAM], speed: [0.3, 0.9] }),
    ],
    sounds: [{ name: "lab-magic-shimmer-1", at: 0, volume: 0.7 }, { name: "lab-success-fanfare-1", at: 250, volume: 0.65 }, { name: "lab-stars-twinkle-1", at: 1300, volume: 0.45 }],
    pip: [{ at: 0, face: "curious", body: "settle" }, { at: 250, body: "pop", face: "proud", haptic: "success" }, { at: 1200, look: [0, -1] }, { at: 1900, look: "off", body: "nod", face: "laugh" }, { at: 3100, face: "smile" }] },
  { id: "dd2-sparklers", name: "Sparkler finale", ms: 3500,
    feel: "Two sparkler fountains shoot gold sparks up from the sheet's corners, then two fireworks open high above Pip.",
    emitters: [
      ...depth(fsparks({ origin: [0.08, 0.82], stagger: 1400, spread: [-96, -70], speed: [1.2, 1.9], drag: 1.3, gravity: 0.75, size: [0.026, 0.06], life: [1200, 1600], fadeOut: 400 }), 80),
      ...depth(fsparks({ origin: [0.92, 0.82], stagger: 1400, at: 120, spread: [-110, -84], speed: [1.2, 1.9], drag: 1.3, gravity: 0.75, size: [0.026, 0.06], life: [1200, 1600], fadeOut: 400 }), 80),
      ...shell(0.25, 0.2, 1500, [GOLD, SUN, OR2], "front"),
      ...shell(0.76, 0.16, 2000, [PINK, LIME, CREAM], "front"),
    ],
    sounds: [{ name: "lab-sparkler-1", at: 0, volume: 0.6 }, { name: "lab-firework-launch-1", at: 1150, volume: 0.5 }, { name: "lab-firework-pop-1", at: 1500, volume: 0.75 }, { name: "lab-firework-pop-2", at: 2000, volume: 0.7 }],
    pip: [{ at: 0, look: [-0.6, 0.5], face: "curious" }, { at: 600, look: [0.6, 0.5] }, { at: 1250, look: [0, -1], face: "laugh" }, { at: 1550, body: "bighop", haptic: "success" }, { at: 2300, look: "off", face: "proud", body: "nod" }, { at: 3100, face: "smile" }] },
];

// Further than ever: the picked acting (leans in, stays) with a rich, calm background
const FURTHER_PIP = [{ at: 0, face: "listening" as const }, { at: 340, body: "lean" as const, haptic: "light" as const }, { at: 1240, face: "warm" as const, body: "settle" as const }, { at: 2600, face: "proud" as const }];
const further: FxEffect[] = [
  fromLib("gold-shower", { id: "fm-gold", name: "Golden shower", feel: "Gold sparkles sink slowly down the whole screen, near ones big and bright, far ones tiny, while a harp plays and he leans in.",
    sounds: [{ name: "lab-harp-gliss-1", at: 0, volume: 0.7 }, { name: "lab-stars-twinkle-1", at: 1200, volume: 0.4 }], pip: FURTHER_PIP }),
  fromLib("rainbow", { id: "fm-rainbow", name: "Rainbow sweep", feel: "Six bands of light sweep across the screen one colour after another, hang as a wide rainbow and drift away while he leans in.",
    sounds: [{ name: "lab-magic-shimmer-1", at: 150, volume: 0.65 }, { name: "lab-soft-bell-1", at: 1300, volume: 0.45 }], pip: FURTHER_PIP }),
  { id: "fm-aurora", name: "Aurora", ms: 4200,
    feel: "The sky behind Pip turns deep blue and soft bands of green, violet and pink light drift across it like an aurora, with slow stars.",
    emitters: [
      night(0, 700, 0.7, 4200),
      ...([[TEAL, 0.3, -6, 0], [LIME, 0.36, 5, 250], [LILAC, 0.42, -3, 500], [PINK, 0.27, 8, 750]] as const).map(([c, y, r, t]): E => ({ kind: "track", layer: "back", shapes: ["ribbon"], colors: [c], origin: [0.5, y], size: [1.25, 1.25], at: 300 + t,
        keys: [{ t: 0, x: -0.12, r, o: 0, s: 0.95 }, { t: 900, x: -0.04, o: 0.85 }, { t: 2200, x: 0.05, r: r * -0.6, s: 1.05 }, { t: 3300 - t, x: 0.1, o: 0 }] })),
      twinkle([0.04, 0.04, 0.96, 0.55], 600, 20, [CREAM, SUN, LILAC], 3000, "back"),
    ],
    sounds: [{ name: "lab-soft-bell-1", at: 200, volume: 0.6 }, { name: "lab-magic-shimmer-2", at: 900, volume: 0.45 }, { name: "lab-stars-twinkle-2", at: 2200, volume: 0.35 }],
    pip: FURTHER_PIP },
];

// Program finished: the biggest moment
const finished: FxEffect[] = [
  { id: "pf-fireworks-night", name: "Fireworks night", ms: 4400,
    feel: "The sky goes dark and five fireworks climb and open one after another over Pip in gold, pink, lime and blue; he cheers at the biggest one.",
    emitters: [
      night(0, 700, 0.85, 4400),
      ...shell(0.22, 0.24, 700, [GOLD, SUN, OR2], "back", 26), ...shell(0.78, 0.18, 1150, [PINK, "#FF9DB1", CREAM], "back", 26),
      ...shell(0.5, 0.12, 1650, [LIME, TEAL, CREAM], "back", 30), ...shell(0.3, 0.32, 2150, [BLUE, LILAC, CREAM], "back", 24), ...shell(0.7, 0.3, 2550, [GOLD, RED, SUN], "back", 30),
      twinkle([0.04, 0.03, 0.96, 0.5], 500, 16, [CREAM, SUN], 3200, "back"),
    ],
    sounds: [{ name: "lab-firework-launch-1", at: 320, volume: 0.5 }, { name: "lab-firework-pop-1", at: 700, volume: 0.75 }, { name: "lab-firework-pop-2", at: 1150, volume: 0.7 },
      { name: "lab-firework-launch-2", at: 1300, volume: 0.45 }, { name: "lab-firework-pop-1", at: 1650, volume: 0.8 }, { name: "lab-firework-pop-2", at: 2150, volume: 0.7 }, { name: "lab-firework-pop-1", at: 2550, volume: 0.8 }, { name: "lab-cheer-short-1", at: 1700, volume: 0.6 }],
    pip: [{ at: 0, look: [0, -1], face: "curious" }, { at: 700, look: [-0.6, -0.8] }, { at: 1150, look: [0.6, -0.9] }, { at: 1650, look: [0, -1], face: "laugh", body: "bighop", haptic: "success" }, { at: 2600, look: "off", face: "proud", body: "pop" }, { at: 3900, face: "smile" }] },
  { id: "pf-grand-finale", name: "Grand finale", ms: 3800,
    feel: "Everything at once: cannons fire from both sides, streamers shoot up from Pip and two fireworks open, with a fanfare and a cheer.",
    emitters: [
      ...depth(toss({ origin: [-0.03, 0.8], spread: [-80, -55], speed: [1.6, 2.8], drag: 1.5, gravity: 0.55, life: [2200, 2800] }), 40),
      ...depth(toss({ at: 200, origin: [1.03, 0.8], spread: [-125, -100], speed: [1.6, 2.8], drag: 1.5, gravity: 0.55, life: [2200, 2800] }), 40),
      ...depth(toss({ at: 450, origin: at(194, 470), shapes: ["streamer"], speed: [0.6, 1.2], drag: 2.0, gravity: 0.32, size: [0.1, 0.17], spin: [30, 130], flip: false, life: [2300, 3000] }), 18),
      ...shell(0.24, 0.18, 900, [GOLD, SUN, OR2], "back"), ...shell(0.76, 0.14, 1350, [PINK, LIME, CREAM], "back"),
    ],
    sounds: [{ name: "lab-cannon-confetti-1", at: 0, volume: 0.8 }, { name: "lab-cannon-confetti-2", at: 200, volume: 0.75 }, { name: "lab-success-fanfare-1", at: 400, volume: 0.7 }, { name: "lab-firework-pop-1", at: 900, volume: 0.6 }, { name: "lab-firework-pop-2", at: 1350, volume: 0.6 }, { name: "lab-cheer-short-2", at: 700, volume: 0.6 }],
    pip: [{ at: 0, face: "curious", body: "settle" }, { at: 450, body: "bighop", face: "laugh", haptic: "success" }, { at: 1400, body: "bounce", face: "proud" }, { at: 2400, look: [0, -0.8] }, { at: 3000, look: "off", face: "smile", body: "nod" }] },
  { id: "pf-star-rays", name: "Rays and stars", ms: 4000,
    feel: "Golden rays open behind Pip, party hats fly up from him and a rain of stars and confetti fills the screen while a fanfare plays.",
    emitters: [
      { kind: "rays", layer: "back", shapes: ["sunburst"], colors: [SUN], origin: at(194, 470), at: 100, size: [2.6, 2.6], spin: [14, 14], life: [3700, 3700], fadeIn: 600, fadeOut: 700, opacity: 0.45 },
      FXK.loose(["hat"], [OR, RED, BLUE, TEAL, PINK], 6, { at: 450, origin: at(194, 450), spread: [-150, -30], size: [0.12, 0.2], speed: [0.6, 1.1], drag: 1.8, gravity: 0.4, spin: [30, 90], life: [2000, 2500] }),
      ...depth(fall({ shapes: ["star", "rect", "strip", "star"], colors: [...PARTY, GOLD], stagger: 1300, flip: true }), 70),
    ],
    sounds: [{ name: "lab-success-fanfare-2", at: 200, volume: 0.7 }, { name: "lab-cartoon-boing-1", at: 450, volume: 0.6 }, { name: "lab-cheer-short-1", at: 900, volume: 0.55 }],
    pip: [{ at: 0, face: "curious" }, { at: 450, body: "bighop", face: "laugh", haptic: "success" }, { at: 1500, body: "sway", face: "proud" }, { at: 3500, face: "smile" }] },
];

// ═════════════ Round 3 (2026-11-28): step skipped and reflection saved, acted with sticker props ═════════════
// The founder's inspiration: everyday things turned into little cars and creatures with happy faces, a peekaboo box, speed lines
// and cloud puffs. So the practice card, the stone and the note have faces; props are big (0.2 to 0.5 of the screen width).
type K = NonNullable<E["keys"]>[number];
const px = (n: number) => n / W;   // screen points -> a track offset (fractions of the screen width)
/** One acting prop: a track at a place on the screen (points), `size` in screen widths; key times are from the effect's start. */
const tr = (shape: string, o: [number, number], size: number, keys: K[], more: Partial<E> = {}): E =>
  ({ kind: "track", shapes: [shape], origin: at(o[0], o[1]), size: [size, size], at: 0, keys, ...more });
/** Hops through points: each hop a parabola sampled every ~30 ms (linear keys: x keeps its speed, y follows the arc).
 *  pts: [time ms, x pt, y pt, arc height pt to the NEXT point]. Offsets are from `o` (points). `tilt` = nose up while in the air. */
function hops(o: [number, number], pts: [number, number, number, number][], tilt = 0): K[] {
  const keys: K[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [ta, xa, ya, h] = pts[i], [tb, xb, yb] = pts[i + 1], n = Math.max(2, Math.round((tb - ta) / 30));
    for (let k = i ? 1 : 0; k <= n; k++) {
      const u = k / n;
      keys.push({ t: Math.round(ta + (tb - ta) * u), x: px(xa + (xb - xa) * u - o[0]), y: px(ya + (yb - ya) * u - 4 * h * u * (1 - u) - o[1]), r: -tilt * Math.sin(Math.PI * u), s: k === n ? 0.9 : 1, e: "lin" });
    }
  }
  return keys;
}
/** A part fixed to a moving body: the body's keys, with the part's offset (dx, dy: screen widths at scale 1) turned and scaled
 *  with the body. `own` = the part's own turn [time, degrees, easing] (a flap folding, a lid); put those times where the body is still. */
function att(body: K[], dx: number, dy: number, own: [number, number, K["e"]?][] = []): K[] {
  let x = 0, y = 0, r = 0, s = 1, o = 1;
  const B = body.map(k => ({ t: k.t, x: (x = k.x ?? x), y: (y = k.y ?? y), r: (r = k.r ?? r), s: (s = k.s ?? s), o: (o = k.o ?? o), e: k.e }));
  const times = [...new Set([...B.map(b => b.t), ...own.map(w => w[0])])].sort((a, b) => a - b);
  return times.map(t => {
    const b = [...B].reverse().find(q => q.t <= t) ?? B[0], w = [...own].reverse().find(q => q[0] <= t), mine = own.find(q => q[0] === t);
    const a = (b.r * Math.PI) / 180;
    return { t, x: b.x + b.s * (dx * Math.cos(a) - dy * Math.sin(a)), y: b.y + b.s * (dx * Math.sin(a) + dy * Math.cos(a)), r: b.r + (w ? w[1] : 0), s: b.s, o: b.o, e: mine ? mine[2] : b.t === t ? b.e : undefined };
  });
}
/** A part that appears on a body part-way: hidden until `t`, then `enter` keys, then it follows the body's keys after `from`. */
const joins = (body: K[], t: number, enter: (Omit<K, "t"> & { t?: number })[], from: number): K[] => [
  { ...enter[0], t: 0, o: 0 }, { ...enter[0], t, o: enter[0].o ?? 1, e: "hold" }, ...enter.slice(1).map(k => ({ ...k, t: k.t ?? t })), ...body.filter(k => k.t > from)];
const ICE = "#BFE3FF";

// ─────────── Step skipped: the practice screen ───────────
// Pip big in the hero (face and collar x 105-285, y 165-396); the sheet below y 396; "Skip this practice" at x 24-149, y 607;
// the empty sheet y 630-750. Tone: not now is fine, on we go. Pip's hands say it (palms-up shrug, a wave).

// A. The skipping stone. Sound lab-water-skip-1 has its three splashes at 10, 320 and 595 ms; lab-plop-small-1 its plop at 85 ms.
const SKIM = 700, TOUCH = [10, 320, 595].map(h => SKIM + h), TX = [84, 184, 258], SINK = TOUCH[2] + 270, SX = 306, WATER = 700;
const splash = (t: number, x: number, size: number): E[] => [
  { kind: "ring", shapes: ["p3-ripple"], colors: [ICE], origin: at(x, WATER + 3), at: t, size: [size * 1.5, size * 1.5], life: [760, 760], opacity: 0.9 },
  { kind: "ring", shapes: ["p3-ripple"], colors: ["#FFFFFF"], origin: at(x, WATER + 3), at: t + 130, size: [size * 0.95, size * 0.95], life: [640, 640], opacity: 0.7 },
  tr("p3-splash", [x, WATER], size, [{ t: 0, s: 0.15, o: 0 }, { t: t - 1, s: 0.15, o: 0, e: "hold" }, { t, o: 1, e: "hold" }, { t: t + 120, s: 1, e: "out" }, { t: t + 220, s: 0.96 }, { t: t + 400, s: 0.6, y: 0.012, o: 0, e: "in" }]),
  { kind: "burst", shapes: ["drop"], colors: [ICE, "#FFFFFF"], origin: at(x, WATER - 4), at: t, count: Math.round(size * 30), spread: [-150, -30], speed: [0.2, 0.42], drag: 1.4, gravity: 2.2, size: [0.014, 0.026], life: [380, 460], upright: true, fadeIn: 20, fadeOut: 120 },
];
const stone = (): E => {
  const o: [number, number] = [-50, 640], yS = WATER - 13;
  const k = hops(o, [[TOUCH[0] - 250, -50, 640, 6], [TOUCH[0], TX[0], yS, 66], [TOUCH[1], TX[1], yS, 44], [TOUCH[2], TX[2], yS, 22], [SINK, SX, yS + 2, 0]], 9);
  return tr("p3-stone", o, 0.28, [{ ...k[0], t: 0, o: 0 }, { ...k[0], o: 1, e: "hold" }, ...k.slice(1), { t: SINK + 240, x: px(SX + 6 - o[0]), y: px(yS + 20 - o[1]), r: 24, s: 0.55, o: 0, e: "in" }]);
};

// B. The sneaker car. Wheels on the ground line y 720; the car is 0.36 of the screen wide.
const CAR = { x: 215, y: 638, S: 0.5 }, HOP = 720, LAND = 1040, GO = 1560;
const carKeys: K[] = [
  { t: 0, x: px(-330), r: 0 }, { t: 480, x: px(8), r: 5, e: "out" }, { t: 620, x: 0, r: 0 },                       // rolls in, brakes nose-down, settles
  { t: LAND, y: 0 }, { t: LAND + 70, y: px(7), s: 0.97 }, { t: LAND + 240, y: 0, s: 1, e: "back" },              // the card lands: the car dips
  { t: GO - 330, x: 0, r: 0 }, { t: GO - 60, x: px(-26), r: 4, e: "out" }, { t: GO, x: px(-26), r: 4 },           // pulls back, crouches
  { t: GO + 90, x: px(10), r: -9, e: "in" }, { t: GO + 470, x: px(330), r: -7, e: "lin" },                       // wheelie and away
];
const SEAT: [number, number] = [-0.2 * CAR.S, -0.22 * CAR.S];
const rider = (): E => {
  const o: [number, number] = [CAR.x, CAR.y], seat = att(carKeys, SEAT[0], SEAT[1]);
  const from: [number, number] = [86, 590], to: [number, number] = [CAR.x + SEAT[0] * W, CAR.y + SEAT[1] * W];
  const fly = hops(o, [[HOP, from[0], from[1], 70], [LAND, to[0], to[1], 0]]).map(k => ({ ...k, s: 0.86, r: -10 + 10 * ((k.t - HOP) / (LAND - HOP)) }));
  return tr("p3-card", o, 0.27, [
    { t: 0, x: px(from[0] - o[0]), y: px(from[1] - o[1]), s: 0, o: 0 }, { t: 180, s: 0, o: 1, e: "hold" }, { t: 420, s: 1, e: "back" },
    { t: HOP - 110, s: 1, r: 0 }, { t: HOP, s: 0.86, y: px(from[1] + 5 - o[1]), r: -10 },
    ...fly.slice(1), ...seat.filter(k => k.t > LAND).map(k => ({ ...k, s: 0.86 * (k.s ?? 1) })),
  ]);
};
const puffs = (t: number, x: number, n: number, big = 0.13): E[] => Array.from({ length: n }, (_, i): E =>
  tr("p3-puff", [x - i * 34, 700 - (i % 2) * 18], big - i * 0.025, [{ t: 0, s: 0, o: 0 }, { t: t + i * 70, s: 0.2, o: 1, e: "hold" }, { t: t + i * 70 + 160, s: 1, e: "out" },
    { t: t + i * 70 + 620, s: 1.25, x: px(-34), y: px(-16), o: 0, e: "out" }]));
const speedLines = (t: number): E[] => [640, 662, 688, 706, 652].map((y, i): E =>
  tr("speed", [195, y], 0.5 + (i % 3) * 0.14, [{ t: 0, x: 1.1, o: 0 }, { t: t + i * 50, x: 1.1, o: 0.9, e: "hold" }, { t: t + i * 50 + 330, x: -1.2, e: "lin" }], { colors: [i % 2 ? "#FFF9E9" : LIME] }));

// C. The balloon. Balloon and card share one box (0.5 of the screen wide): the card's face sits at the Skip link.
const LOON = { x: 62, y: 538, S: 0.5 }, LIFT = 950;
const loonKeys: K[] = [
  { t: LIFT - 150, y: 0, r: 0 }, { t: LIFT, y: px(8), r: 0, e: "out" },                                  // the string pulls tight: a small dip
  { t: LIFT + 420, y: px(-70), x: px(10), r: 5, e: "in" }, { t: LIFT + 980, y: px(-230), x: px(-12), r: -6, e: "lin" }, { t: LIFT + 1540, y: px(-400), x: px(10), r: 5, e: "lin" },
  { t: LIFT + 2100, y: px(-560), x: px(-8), r: -4, e: "lin" }, { t: LIFT + 2650, y: px(-730), x: px(6), r: 3, e: "lin" },
];

const skipped: FxEffect[] = [
  // SYNC: the stone's three touches land on the three splashes of lab-water-skip-1 (710, 1020, 1295 ms); it sinks on the plop
  // of lab-plop-small-1 (1565 ms); the pond pops open on "pop".
  { id: "sk3-skimmer", name: "Happy skimming stone", ms: 3500,
    feel: "Pip shrugs, palms up, as a pond opens on the empty sheet and a big smiling stone is skimmed across it: three skips, each lower and shorter, a crown splash and ripples on every touch, then it sinks with a plop.",
    emitters: [
      tr("p3-pond", [195, WATER + 2], 0.92, [{ t: 0, s: 0 }, { t: 90, s: 0 }, { t: 400, s: 1, e: "back" }, { t: 2650, s: 1 }, { t: 2760, s: 1.04, e: "out" }, { t: 3000, s: 0, e: "in" }]),
      ...TOUCH.flatMap((t, i) => splash(t, TX[i], [0.26, 0.2, 0.15][i])),
      stone(),
      ...splash(SINK + 60, SX + 4, 0.22),
    ],
    sounds: [{ name: "pop", at: 110, volume: 0.35 }, { name: "lab-water-skip-1", at: SKIM, volume: 0.95 }, { name: "lab-plop-small-1", at: SINK - 25, volume: 0.7 }, { name: "lab-kalimba-warm-1", at: SINK + 500, volume: 0.4 }],
    pip: [{ at: 0, move: "h-palms", look: [-0.9, 0.9] }, { at: TOUCH[0] - 80, look: [-0.6, 1] }, { at: TOUCH[1] - 80, look: [0, 1] }, { at: TOUCH[2] - 80, look: [0.45, 1] }, { at: SINK - 60, look: [0.75, 1], haptic: "light" },
      { at: SINK + 600, look: "off" }] },
  // SYNC: the card springs on lab-hop-boing-small-1 (720 ms) and lands in the shoe on the pat of lab-grip-pat-2 (1040 ms);
  // the car shoots off on lab-ff-zip-2 (1560 ms), with a whoosh under the speed lines.
  { id: "sk3-sneaker-car", name: "Sneaker car getaway", ms: 3600,
    feel: "A sneaker on wheels rolls up, the practice card (it has a happy face) hops out of the Skip link into it, the car pulls back, pops a wheelie and zooms off in cloud puffs and speed lines while Pip gives an easy shrug.",
    emitters: [
      rider(),
      tr("p3-sneaker", [CAR.x, CAR.y], CAR.S, carKeys),
      ...puffs(480, 118, 2, 0.12), ...puffs(GO + 40, 190, 4, 0.22),
      ...speedLines(GO + 120),
    ],
    sounds: [{ name: "lab-swoosh-soft-2", at: 0, volume: 0.5 }, { name: "pop", at: 200, volume: 0.45 }, { name: "lab-hop-boing-small-1", at: HOP, volume: 0.65 }, { name: "lab-grip-pat-2", at: LAND - 60, volume: 0.75 },
      { name: "lab-ff-zip-2", at: GO, volume: 0.8 }, { name: "whoosh", at: GO + 60, volume: 0.45 }, { name: "chime-up", at: GO + 700, volume: 0.35 }],
    pip: [{ at: 0, look: [-0.5, 1], face: "curious" }, { at: 250, move: "h-palms" }, { at: HOP, look: [-0.3, 1] }, { at: LAND, look: [0.1, 1], haptic: "light" }, { at: GO, look: [0.9, 0.9] },
      { at: GO + 600, look: "off" }] },
  // SYNC: the card pops on "pop" (40 ms); the balloon springs full on lab-cartoon-boing-2 (430 ms); lift-off on
  // lab-hop-boing-small-2 (950 ms, the string pulls tight); the balloon hiss runs under the climb.
  { id: "sk3-float-away", name: "Floats away", ms: 4200,
    feel: "The practice card pops out of the Skip link, a lime balloon springs up above it, the string pulls tight and the card floats up past Pip and out of the top of the screen while he waves it goodbye.",
    emitters: [
      tr("p3-loon-card", [LOON.x, LOON.y], LOON.S, [{ t: 0, s: 0 }, { t: 60, s: 0 }, { t: 320, s: 1, e: "back" }, ...loonKeys]),
      tr("p3-loon", [LOON.x, LOON.y], LOON.S, [{ t: 0, s: 0 }, { t: 430, s: 0 }, { t: 640, s: 1.14, e: "out" }, { t: 760, s: 0.96 }, { t: 840, s: 1 }, ...loonKeys], { colors: [LIME] }),
      { kind: "burst", shapes: ["sparkle", "glitter"], colors: [LIME, CREAM, SUN], origin: at(LOON.x, LOON.y - 60), at: 620, count: 8, spread: [0, 360], speed: [0.2, 0.45], drag: 3, size: [0.025, 0.05], life: [500, 800] },
      { kind: "twinkle", shapes: ["sparkle"], colors: [CREAM, LIME], count: 6, at: LIFT + 300, stagger: 1500, area: [0.03, 0.2, 0.3, 0.75], size: [0.03, 0.05], life: [500, 800] },
    ],
    sounds: [{ name: "pop", at: 40, volume: 0.5 }, { name: "lab-cartoon-boing-2", at: 425, volume: 0.6 }, { name: "lab-hop-boing-small-2", at: LIFT, volume: 0.55 }, { name: "lab-balloon-release-2", at: LIFT + 100, volume: 0.3 },
      { name: "lab-kalimba-warm-2", at: LIFT + 500, volume: 0.5 }],
    pip: [{ at: 0, look: [-0.9, 1], face: "curious" }, { at: 120, move: "h-wave" }, { at: LIFT + 400, look: [-1, 0.7] }, { at: LIFT + 1000, look: [-1, 0.1] }, { at: LIFT + 1600, look: [-1, -0.6] }, { at: LIFT + 2300, look: [-0.7, -1] },
      { at: 3900, look: "off" }] },
];

// ─────────── Reflection saved: the form screen ───────────
// Pip small, top right (x 254-386, y 136-250); the form fills y 270-760; Save at the bottom (y 765-815). The note (your words,
// with a happy face) always comes out of the Save button; what keeps it stands in the middle of the form, clear of Pip.
const SAVE: [number, number] = [195, 778];
/** The note pops out of Save at `t`, crouches and jumps up to (x, y) by `top`. */
const noteUp = (t: number, top: number, x: number, y: number): K[] => [
  { t: 0, s: 0, o: 0 }, { t, s: 0, o: 1, e: "hold" }, { t: t + 200, s: 1, e: "back" }, { t: t + 290, s: 0.9, y: px(6), r: 0 },
  { t: top, x: px(x - SAVE[0]), y: px(y - SAVE[1]), s: 1, r: -8, e: "out" }];
const leaveToPip = (c: [number, number], t: number): K[] => [{ t, x: 0, y: 0, s: 1, r: 0 }, { t: t + 130, y: px(10), s: 0.96 }, { t: t + 520, x: px(232 - c[0]), y: px(268 - c[1]), s: 0.14, r: 10, e: "in" }, { t: t + 560, o: 0 }];

// A. The cardboard box
const BOX: [number, number] = [195, 500], BS = 0.56;
const boxKeys: K[] = [{ t: 0, y: px(150), s: 0.5, o: 0 }, { t: 60, o: 1 }, { t: 380, y: 0, s: 1, e: "back" }, { t: 1110, s: 1, y: 0 }, { t: 1170, s: 1.05, y: px(4) }, { t: 1330, s: 1, y: 0, e: "back" },
  { t: 2460, s: 1 }, { t: 2520, s: 0.95 }, { t: 2680, s: 1, e: "back" }, ...leaveToPip(BOX, 3350)];
// B. The jar of kept notes
const JAR: [number, number] = [195, 492], JS = 0.56;
const jarKeys: K[] = [{ t: 0, s: 0 }, { t: 320, s: 1, e: "back" }, { t: 1500, s: 1 }, { t: 1560, s: 1.05 }, { t: 1720, s: 1, e: "back" }, { t: 2050, s: 1 }, { t: 2110, s: 0.95 }, { t: 2270, s: 1, e: "back" },
  { t: 2380, r: -6 }, { t: 2510, r: 6 }, { t: 2640, r: -3 }, { t: 2750, r: 0 }, { t: 3100, s: 1 }, { t: 3230, s: 1.1, e: "out" }, { t: 3440, s: 0, e: "in" }];
// C. The envelope
const ENV: [number, number] = [195, 492], ES = 0.6;
const envKeys: K[] = [{ t: 0, s: 0 }, { t: 320, s: 1, e: "back" }, { t: 1225, s: 1 }, { t: 1290, s: 1.04 }, { t: 1420, s: 1 }, { t: 1500, s: 1 }, { t: 1560, s: 0.94 }, { t: 1720, s: 1, e: "back" },
  { t: 2130, s: 1 }, { t: 2190, s: 0.93 }, { t: 2360, s: 1, e: "back" }, ...leaveToPip(ENV, 2750)];
const glow = (c: [number, number], t: number, colors: string[]): E[] => [
  { kind: "burst", shapes: ["sparkle", "glitter", "dot"], colors, origin: at(c[0], c[1]), at: t, count: 14, spread: [0, 360], speed: [0.3, 0.7], drag: 3, gravity: 0.08, size: [0.026, 0.055], life: [700, 1100], fadeOut: 400 },
  { kind: "twinkle", shapes: ["sparkle", "sparkpair"], colors, count: 8, at: t + 100, stagger: 700, area: [(c[0] - 150) / W, (c[1] - 130) / H, (c[0] + 150) / W, (c[1] + 110) / H], size: [0.04, 0.075], life: [500, 800] },
];

const saved: FxEffect[] = [
  // SYNC: the note springs on lab-hop-boing-small-1 (590 ms) and lands in the box on lab-envelope-tuck-2 (1110 ms); it peeks on
  // "boop" (1450 ms); the flaps slap shut on the pat of lab-grip-pat-2 (2320 ms) and the thud of lab-book-close-2 (2460 ms);
  // the tape zips on with lab-ff-zip-1 (2750 ms); the check pops on lab-save-confirm-1 (2980 ms).
  { id: "rs3-peekaboo-box", name: "Peekaboo keepsake box", ms: 3950,
    feel: "A cardboard box pops up, your note (it has a happy face) jumps out of Save into it, peeks back out with big eyes, ducks, the flaps fold shut, lime tape seals it, a green check lands on the front and the box goes off to Pip.",
    emitters: [
      tr("p3-box-in", BOX, BS, [...boxKeys.filter(k => k.t < 2460), { t: 2460, o: 0, e: "hold" }]),
      tr("p3-note", SAVE, 0.24, [...noteUp(300, 900, BOX[0], 322), { t: 1000, y: px(314 - SAVE[1]), r: 0 }, { t: 1110, y: px(BOX[1] + 10 - SAVE[1]), s: 0.8, e: "in" }, { t: 1120, o: 0, e: "hold" }]),
      tr("p3-note-peek", BOX, 0.24, [{ t: 0, o: 0, y: px(38) }, { t: 1450, o: 1, e: "hold" }, { t: 1620, y: px(-14), e: "back" }, { t: 1780, r: -8 }, { t: 1960, r: 7 }, { t: 2060, r: 0 }, { t: 2180, y: px(38), e: "in" }, { t: 2190, o: 0, e: "hold" }]),
      tr("p3-box-front", BOX, BS, boxKeys),
      tr("p3-flap-l", BOX, BS * 2, att(boxKeys, -0.34 * BS, -0.04 * BS, [[0, -138], [2180, -138], [2320, 0, "in"]])),
      tr("p3-flap-r", BOX, BS * 2, att(boxKeys, 0.34 * BS, -0.04 * BS, [[0, 138], [2320, 138], [2460, 0, "in"]])),
      tr("p3-box-tape", BOX, BS, joins(boxKeys, 2750, [{ y: px(-26), o: 1 }, { t: 2850, y: 0, e: "in" }], 2850)),
      tr("p3-badge", BOX, BS, joins(boxKeys, 2980, [{ s: 0.4, o: 1 }, { t: 3110, s: 1.2, e: "out" }, { t: 3220, s: 1 }], 3220)),
      ...glow([BOX[0] + 40, BOX[1] + 40], 3000, [LIME, CREAM, GOLD]),
    ],
    sounds: [{ name: "pop", at: 60, volume: 0.45 }, { name: "lab-hop-boing-small-1", at: 590, volume: 0.6 }, { name: "lab-envelope-tuck-2", at: 1110, volume: 0.7 }, { name: "boop", at: 1450, volume: 0.55 },
      { name: "lab-grip-pat-2", at: 2260, volume: 0.8 }, { name: "lab-book-close-2", at: 2420, volume: 0.8 }, { name: "lab-ff-zip-1", at: 2750, volume: 0.6 }, { name: "lab-save-confirm-1", at: 2980, volume: 0.75 },
      { name: "lab-swoosh-soft-1", at: 3480, volume: 0.4 }],
    pip: [{ at: 0, look: [-0.7, 1], face: "curious" }, { at: 1450, face: "laugh", body: "hop" }, { at: 2320, face: "smile" }, { at: 2980, face: "proud", body: "nod", haptic: "success" }, { at: 3700, look: "off", face: "warm" }] },
  // SYNC: the note folds into a heart on lab-page-flip-2 (900 ms); the heart lands in the jar on "ding" (1500 ms); the lid
  // clicks on with lab-lock-click-2 (2050 ms); the check and the glow come on lab-save-confirm-2 (2300 ms).
  { id: "rs3-heart-jar", name: "Jar of kept notes", ms: 3500,
    feel: "A glass jar of folded notes pops up, your note jumps out of Save, folds itself into a red heart and drops in with the others, the gold lid clicks on, the jar wiggles and glows and a green check lands on it.",
    emitters: [
      tr("p3-jar", JAR, JS, jarKeys),
      tr("p3-note", SAVE, 0.24, [...noteUp(300, 860, JAR[0], 305), { t: 900, s: 1, r: 0 }, { t: 1030, s: 0.25, r: 200, e: "in" }, { t: 1040, o: 0, e: "hold" }]),
      tr("p3-heart", [JAR[0], 305], 0.17, [{ t: 0, s: 0.3, o: 0 }, { t: 980, o: 1, e: "hold" }, { t: 1130, s: 1.25, e: "out" }, { t: 1230, s: 1 }, { t: 1300, y: px(-8), e: "out" },
        { t: 1500, x: 0.02 * JS, y: px(JAR[1] - 305) + 0.08 * JS, s: 0.9, e: "in" }, { t: 1510, o: 0, e: "hold" }]),
      tr("p3-jar-heart", JAR, JS, joins(jarKeys, 1500, [{ y: 0, o: 1 }, { t: 1580, y: px(-9), e: "out" }, { t: 1700, y: 0, e: "in" }], 1720)),
      tr("p3-jar-shine", JAR, JS, jarKeys),
      tr("p3-jar-lid", JAR, JS, [{ t: 0, s: 0, y: -0.16 * JS, x: 0.5 * JS, r: 16 }, { t: 320, s: 1, e: "back" }, { t: 1000, y: -0.2 * JS, r: 12 }, { t: 1740, y: -0.16 * JS, r: 16 }, { t: 1900, x: 0, y: -0.24 * JS, r: 4, e: "io" }, { t: 2050, y: 0, r: 0, e: "in" }, ...jarKeys.filter(k => k.t > 2050)]),
      tr("p3-badge", JAR, JS, joins(jarKeys, 2300, [{ s: 0.4, o: 1 }, { t: 2430, s: 1.2, e: "out" }, { t: 2540, s: 1 }], 2750)),
      ...glow(JAR, 2320, [GOLD, CREAM, PINK]),
    ],
    sounds: [{ name: "pop", at: 60, volume: 0.45 }, { name: "lab-hop-boing-small-1", at: 590, volume: 0.55 }, { name: "lab-page-flip-2", at: 900, volume: 0.7 }, { name: "ding", at: 1500, volume: 0.55 },
      { name: "lab-lock-click-2", at: 2050, volume: 0.85 }, { name: "lab-save-confirm-2", at: 2300, volume: 0.75 }, { name: "lab-stars-twinkle-1", at: 2450, volume: 0.3 }],
    pip: [{ at: 0, look: [-0.7, 1], face: "curious" }, { at: 1000, face: "smile" }, { at: 1500, body: "nod" }, { at: 2300, face: "proud", body: "pop", haptic: "success" }, { at: 3200, look: "off", face: "warm" }] },
  // SYNC: the note slides in on the two rustles of lab-envelope-tuck-1 (1000 and 1225 ms); the flap shuts on the pat of
  // lab-grip-pat-2 (1500 ms); the wax seal stamps on the thump of lab-rubber-stamp-1 (2130 ms), with lab-save-confirm-1 right after.
  { id: "rs3-sealed", name: "Signed and sealed", ms: 4200,
    feel: "An envelope pops open, your note jumps out of Save and slides inside, the flap shuts, a red wax seal with a check stamps it closed, and the envelope flies up to Pip, who makes heart hands.",
    emitters: [
      tr("p3-env-back", ENV, ES, envKeys),
      tr("p3-env-flap-up", ENV, ES, [...envKeys.filter(k => k.t < 1500), { t: 1500, o: 0, e: "hold" }]),
      tr("p3-note", SAVE, 0.24, [...noteUp(250, 800, ENV[0], 300), { t: 1000, y: px(294 - SAVE[1]), r: 0 }, { t: 1225, y: px(ENV[1] + 42 - SAVE[1]), s: 0.84, e: "io" }, { t: 1490, s: 0.84 }, { t: 1500, o: 0, e: "hold" }]),
      tr("p3-env-front", ENV, ES, envKeys),
      tr("p3-env-flap", ENV, ES, joins(envKeys, 1500, [{ s: 1, o: 1 }], 1500)),
      tr("p3-env-seal", ENV, ES, joins(envKeys, 2000, [{ s: 2.4, y: -0.1 * ES, o: 0 }, { t: 2040, o: 1 }, { t: 2130, s: 1, y: 0, e: "in" }], 2130)),
      { kind: "ring", shapes: ["p3-ripple"], colors: [CREAM], origin: at(ENV[0], ENV[1] + 0.115 * ES * W), at: 2130, size: [0.5, 0.5], life: [450, 450], opacity: 0.8 },
      ...glow([ENV[0], ENV[1] + 20], 2150, [RED, CREAM, GOLD]),
      { kind: "rise", shapes: ["heart"], colors: [RED, PINK], count: 5, at: 3200, stagger: 400, area: [0.55, 0.24, 0.64, 0.31], speed: [0.12, 0.2], sway: 0.015, size: [0.035, 0.055], life: [550, 600], upright: true },
    ],
    sounds: [{ name: "pop", at: 60, volume: 0.45 }, { name: "lab-hop-boing-small-1", at: 540, volume: 0.55 }, { name: "lab-envelope-tuck-1", at: 1000, volume: 0.75 }, { name: "lab-grip-pat-2", at: 1440, volume: 0.75 },
      { name: "lab-rubber-stamp-1", at: 2110, volume: 0.9 }, { name: "lab-save-confirm-1", at: 2230, volume: 0.65 }, { name: "lab-swoosh-soft-1", at: 2880, volume: 0.45 }, { name: "heart-blip", at: 3270, volume: 0.5 }],
    pip: [{ at: 0, look: [-0.7, 1], face: "curious" }, { at: 800, move: "h-heart" }, { at: 2130, look: [-0.6, 0.9], haptic: "success" }, { at: 3300, look: "off" }] },
];

/** The sample options per moment id (they replace the old options in the lab while the samples are judged). */
export const SAMPLE_MOMENTS: Record<string, FxEffect[]> = {
  "step-done": stepDone,
  "day-done": dayDone2,
  "furthest-moment": further,
  "program-finished": finished,
  "step-skipped": skipped,
  "reflection-saved": saved,
  "day-closed": nextDay,
  ...SAMPLES_B2A,
  ...SAMPLES_B2B,
};
