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

// Step skipped (the practice screen; "Skip this practice" at x 24-149, y 607; empty sheet below it, y 640-750)
const SKIP_PIP = (follow: number): any[] => [{ at: 0, face: "warm", look: [-0.7, 1] }, { at: follow, look: [0.7, 1] }, { at: follow + 700, look: "off", body: "sway" }, { at: follow + 1500, face: "smile", body: "nod" }];
const skipped: FxEffect[] = [
  { id: "sk-stone", name: "Skipping stone", ms: 2800,
    feel: "A pebble skips across the empty sheet from the Skip link: three hops, a ripple at each touch, then it slides off the edge. Pip follows it and shrugs: fine by me.",
    emitters: [
      { kind: "track", shapes: ["stone"], origin: at(150, 640), size: [0.07, 0.07], at: 100,
        keys: [{ t: 0, x: -0.1, y: -0.08, o: 0 }, { t: 80, o: 1 }, { t: 300, x: 0, y: 0.08, e: "in" }, { t: 560, x: 0.18, y: -0.02, e: "out" }, { t: 760, x: 0.32, y: 0.1, e: "in" }, { t: 940, x: 0.44, y: 0.04, e: "out" },
          { t: 1080, x: 0.53, y: 0.12, e: "in" }, { t: 1600, x: 0.78, y: 0.13, o: 0, e: "out" }] },
      ...[[400, 150 + 0, 671], [860, 150 + 0.32 * W, 679], [1180, 150 + 0.53 * W, 687]].map(([t, x, y]): E => ({ kind: "ring", shapes: ["ringline"], colors: [CREAM], origin: at(x, y), at: t, size: [0.18, 0.18], life: [650, 650], opacity: 0.8 })),
    ],
    sounds: [{ name: "lab-water-skip-1", at: 380, volume: 0.75 }, { name: "lab-swoosh-soft-1", at: 1150, volume: 0.4 }],
    pip: SKIP_PIP(700) },
  { id: "sk-plane", name: "Paper plane", ms: 2700,
    feel: "A paper plane takes off from the Skip link, loops once over the sheet and glides off the right edge, leaving a dotted trail. Pip watches it go and nods.",
    emitters: [
      { kind: "track", shapes: ["plane"], origin: at(150, 610), size: [0.12, 0.12], at: 100,
        keys: [{ t: 0, s: 0.4, o: 0, r: -10 }, { t: 120, s: 1, o: 1 }, { t: 500, x: 0.25, y: -0.1, r: -30 }, { t: 800, x: 0.4, y: -0.02, r: 60 }, { t: 1050, x: 0.3, y: 0.06, r: 170 }, { t: 1300, x: 0.38, y: -0.06, r: 330 },
          { t: 1900, x: 0.95, y: -0.2, r: 345, e: "in" }] },
      { kind: "twinkle", shapes: ["dot"], colors: [CREAM], count: 14, at: 300, stagger: 1500, area: [0.42, 0.62, 0.95, 0.76], size: [0.012, 0.018], life: [500, 700], opacity: 0.7 },
    ],
    sounds: [{ name: "lab-swoosh-soft-1", at: 150, volume: 0.6 }, { name: "lab-swoosh-soft-2", at: 1300, volume: 0.5 }],
    pip: SKIP_PIP(800) },
  { id: "sk-ball", name: "Bouncy ball", ms: 2600,
    feel: "A small orange ball drops out of the Skip link and bounces across the sheet, each bounce lower, then rolls off. Boing, boing, boing.",
    emitters: [
      { kind: "track", shapes: ["ball"], origin: at(150, 700), size: [0.06, 0.06], at: 100,
        keys: [{ t: 0, x: -0.05, y: -0.22, o: 0 }, { t: 60, o: 1 }, { t: 320, x: 0, y: 0, e: "in" }, { t: 560, x: 0.14, y: -0.16, e: "out" }, { t: 800, x: 0.28, y: 0, e: "in" }, { t: 980, x: 0.38, y: -0.09, e: "out" },
          { t: 1160, x: 0.48, y: 0, e: "in" }, { t: 1280, x: 0.54, y: -0.03, e: "out" }, { t: 1400, x: 0.6, y: 0, e: "in" }, { t: 2000, x: 0.85, y: 0, r: 540, o: 0, e: "lin" }] },
    ],
    sounds: [{ name: "lab-cartoon-boing-1", at: 400, volume: 0.6 }, { name: "lab-cartoon-boing-1", at: 880, volume: 0.45 }, { name: "lab-cartoon-boing-2", at: 1240, volume: 0.35 }],
    pip: SKIP_PIP(600) },
];

// Reflection saved (picked acting: leans close, warm). Only the sound was wrong: three sound ideas, each with a small touch.
const SAVED_PIP = [{ at: 0, face: "warm" as const, body: "lean" as const }, { at: 1100, body: "nod" as const }];
const saved: FxEffect[] = [
  { id: "rs-tucked", name: "Note tucked in", ms: 2000,
    feel: "A folded note slides up from the Save button and tucks away behind the sheet's edge with a paper sound and two soft kalimba notes.",
    emitters: [{ kind: "track", shapes: ["note"], origin: at(195, 760), size: [0.1, 0.1], at: 0,
      keys: [{ t: 0, s: 0.6, o: 0 }, { t: 150, s: 1, o: 1, y: -0.05 }, { t: 650, x: 0.18, y: -1.2, r: -10 }, { t: 850, x: 0.2, y: -1.28, s: 0.5, o: 0 }] }],
    sounds: [{ name: "lab-envelope-tuck-1", at: 500, volume: 0.7 }, { name: "lab-kalimba-warm-1", at: 800, volume: 0.6 }], pip: SAVED_PIP },
  { id: "rs-bell", name: "Soft bell", ms: 1800,
    feel: "One warm bell note and a few slow sparkles around Pip as he leans in.",
    emitters: [twinkle([0.55, 0.1, 0.98, 0.3], 200, 6, [CREAM, SUN], 900)],
    sounds: [{ name: "lab-soft-bell-1", at: 150, volume: 0.6 }], pip: SAVED_PIP },
  { id: "rs-harp", name: "Harp breath", ms: 1800,
    feel: "A gentle harp run upward, like a breath out, while he leans in.",
    emitters: [twinkle([0.55, 0.1, 0.98, 0.3], 300, 5, [CREAM, LILAC], 900)],
    sounds: [{ name: "lab-harp-gliss-1", at: 100, volume: 0.55 }], pip: SAVED_PIP },
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
};
