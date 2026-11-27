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
type K = NonNullable<E["keys"]>[number];
/** A flight through points: each hop a parabola sampled every ~35 ms (linear keys, so x keeps its speed and y follows the arc).
 *  pts: [time ms, x pt, y pt, arc height pt to the NEXT point]; offsets are from the first point, in screen-width fractions. */
function flight(pts: [number, number, number, number][], spin = 0): K[] {
  const [, x0, y0] = pts[0], keys: K[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [ta, xa, ya, h] = pts[i], [tb, xb, yb] = pts[i + 1], n = Math.max(2, Math.round((tb - ta) / 35));
    for (let k = i ? 1 : 0; k <= n; k++) {
      const u = k / n, x = xa + (xb - xa) * u, y = ya + (yb - ya) * u - 4 * h * u * (1 - u);
      keys.push({ t: Math.round(ta + (tb - ta) * u), x: (x - x0) / W, y: (y - y0) / W, r: spin ? (u < 0.5 ? -spin : spin) * Math.sin(Math.PI * u) : undefined, e: "lin" });
    }
  }
  return keys;
}
const WATER = 688, SKIP_SND = 300;
// the stone's touches land exactly on the splashes in lab-water-skip-1 (10, 320, 605 and 825 ms into the sound)
const TOUCH = [10, 320, 605, 825].map(h => SKIP_SND + h);
const STONE: [number, number, number, number][] = [[SKIP_SND - 260, 70, 612, 10], [TOUCH[0], 140, WATER, 46], [TOUCH[1], 232, WATER, 30], [TOUCH[2], 300, WATER, 16], [TOUCH[3], 344, WATER, 6], [TOUCH[3] + 160, 366, WATER, 0]];
const ripple = (t: number, x: number, size: number): E[] => [
  { kind: "ring", shapes: ["ringline"], colors: ["#A9DCFF"], origin: at(x, WATER + 6), at: t, size: [size, size], life: [760, 760], opacity: 0.85 },
  { kind: "burst", shapes: ["drop"], colors: ["#BFE3FF", CREAM], origin: at(x, WATER), at: t, count: Math.round(size * 40), spread: [-150, -30], speed: [0.22, 0.42], drag: 1.5, gravity: 2.4, size: [0.012, 0.02], life: [360, 420], upright: true, fadeIn: 20, fadeOut: 120 },
];
/** The stone: skimmed from the left of the Skip link, four touches on the splashes, a last slide, then it sinks. */
function stoneTrack(): E {
  const T0 = STONE[0][0], k = flight(STONE.map(([t, x, y, h]) => [t - T0, x, y, h] as [number, number, number, number]), 10);
  const end = STONE[STONE.length - 1][0] - T0;
  return { kind: "track", shapes: ["stone"], origin: at(70, 612), size: [0.085, 0.085], at: T0,
    keys: [{ ...k[0], o: 0 }, { ...k[1], o: 1 }, ...k.slice(2), { t: end + 220, x: (366 - 70) / W, y: (WATER + 8 - 612) / W, s: 0.5, o: 0, e: "in" }] };
}
const skipped: FxEffect[] = [
  { id: "sk2-stone", name: "Skipping stone", ms: 2600,
    feel: "A flat pebble is skimmed from the Skip link across the empty sheet: four touches, each hop shorter and lower, a splash and a ripple on every touch, exactly on the sound, then it sinks.",
    emitters: [
      stoneTrack(),
      ...TOUCH.flatMap((t, i) => ripple(t, [140, 232, 300, 344][i], [0.2, 0.17, 0.14, 0.11][i])),
      ...ripple(TOUCH[3] + 220, 366, 0.24),
    ],
    sounds: [{ name: "lab-water-skip-1", at: SKIP_SND, volume: 0.9 }, { name: "lab-plop-small-1", at: TOUCH[3] + 200, volume: 0.6 }],
    pip: [{ at: 0, face: "warm", look: [-0.7, 1] }, ...TOUCH.map((t, i) => ({ at: t - 60, look: [[-0.35, 1], [0.15, 1], [0.5, 1], [0.8, 1]][i] as [number, number] })),
      { at: TOUCH[3] + 450, look: "off", face: "smile", body: "sway" }, { at: TOUCH[3] + 1250, body: "nod" }] },
  { id: "sk2-frog", name: "Leap frog", ms: 2600,
    feel: "A little frog pops out of the Skip link, says ribbit, and leaps over the practice in three springy hops, each hop on its own boing, and out of the screen.",
    emitters: [{ kind: "track", shapes: ["frog"], origin: at(150, 670), size: [0.17, 0.17], at: 0,
      keys: [{ t: 0, s: 0, y: 0.02 }, { t: 260, s: 1, y: 0, e: "back" }, { t: 560, s: 1 }, { t: 620, s: 0.9, y: 0.01 },
        ...flight([[640, 150, 670, 80], [1020, 232, 670, 80], [1400, 314, 670, 80], [1780, 450, 630, 0]]).map(k => ({ ...k, x: k.x, y: (k.y ?? 0) })) , { t: 1820, o: 0 }] }],
    sounds: [{ name: "lab-frog-ribbit-cartoon-1", at: 300, volume: 0.75 }, { name: "lab-hop-boing-small-1", at: 640, volume: 0.6 }, { name: "lab-hop-boing-small-1", at: 1020, volume: 0.55 }, { name: "lab-hop-boing-small-1", at: 1400, volume: 0.5 }],
    pip: [{ at: 0, face: "curious", look: [-0.6, 1] }, { at: 640, look: [-0.2, 1], face: "laugh" }, { at: 1020, look: [0.3, 1] }, { at: 1400, look: [0.8, 1] }, { at: 1900, look: "off", face: "smile", body: "sway" }] },
  { id: "sk2-flick", name: "Flick it away", ms: 2000,
    feel: "A little card of this practice pops up and gets flicked off to the right with a spin and a swish: not now, and that is fine.",
    emitters: [
      { kind: "track", shapes: ["card"], origin: at(200, 520), size: [0.3, 0.3], at: 0,
        keys: [{ t: 0, s: 0, o: 0 }, { t: 80, o: 1 }, { t: 280, s: 1, e: "back" }, { t: 560, r: -6, x: -0.02 }, { t: 640, r: -10, x: -0.03, e: "out" },
          { t: 1000, x: 0.95, y: -0.28, r: 200, s: 0.7, e: "in" }, { t: 1040, o: 0 }] },
      { kind: "twinkle", shapes: ["sparkle", "dot"], colors: [CREAM, SUN], count: 8, at: 700, stagger: 300, area: [0.55, 0.42, 0.98, 0.62], size: [0.02, 0.035], life: [300, 500] },
    ],
    sounds: [{ name: "pop", at: 0, volume: 0.4 }, { name: "lab-card-flick-1", at: 640, volume: 0.75 }],
    pip: [{ at: 0, face: "curious", look: [-0.4, 1] }, { at: 640, look: [0.8, 0.2], face: "smile" }, { at: 1200, look: "off", body: "sway" }, { at: 1700, body: "nod" }] },
];

// Reflection saved (the form screen: Save button at the bottom (y 790), the form fields in the middle). Picked acting: leans close, warm.
const SAVED_END = [{ at: 0, face: "warm" as const }];
const saved: FxEffect[] = [
  { id: "rs2-journal", name: "Into the journal", ms: 2200,
    feel: "A journal opens over the form, your note flies up from Save into it, it shuts with a soft clap, a green check lands on the cover, and it floats off to Pip.",
    emitters: [
      { kind: "track", shapes: ["book-open"], origin: at(195, 440), size: [0.34, 0.34], at: 0, keys: [{ t: 0, s: 0 }, { t: 260, s: 1, e: "back" }, { t: 780, s: 1, o: 1 }, { t: 800, o: 0, e: "hold" }] },
      { kind: "track", shapes: ["note"], origin: at(195, 780), size: [0.1, 0.1], at: 120, keys: [{ t: 0, s: 0.5, o: 0 }, { t: 100, s: 1, o: 1 }, ...flight([[100, 195, 780, 60], [560, 195, 450, 0]]).slice(1), { t: 640, s: 0.4, o: 0 }] },
      { kind: "track", shapes: ["book-closed"], origin: at(195, 440), size: [0.26, 0.26], at: 780,
        keys: [{ t: 0, s: 1.15, o: 0 }, { t: 20, o: 1, e: "hold" }, { t: 140, s: 1 }, { t: 700, s: 1 }, { t: 1150, x: 0.34, y: -0.66, s: 0.3, o: 0, e: "in" }] },
      { kind: "track", shapes: ["check-badge"], origin: at(205, 440), size: [0.12, 0.12], at: 930,
        keys: [{ t: 0, s: 0 }, { t: 200, s: 1.15, e: "out" }, { t: 300, s: 1 }, { t: 550, s: 1 }, { t: 1000, x: 0.31, y: -0.66, s: 0.3, o: 0, e: "in" }] },
      sparks(at(205, 440), 950, [LIME, CREAM, GOLD], 10),
    ],
    sounds: [{ name: "lab-page-flip-1", at: 0, volume: 0.5 }, { name: "lab-envelope-tuck-1", at: 520, volume: 0.6 }, { name: "lab-book-close-1", at: 790, volume: 0.8 }, { name: "lab-save-confirm-1", at: 940, volume: 0.7 }],
    pip: [...SAVED_END, { at: 200, look: [-1, 1] }, { at: 1500, look: "off", body: "lean" }, { at: 2000, body: "nod" }] },
  { id: "rs2-stamp", name: "Stamped", ms: 2200,
    feel: "A rubber stamp drops onto the sheet above Save, thump, lifts away and leaves a green check seal that glows for a moment.",
    emitters: [
      { kind: "track", shapes: ["stamp"], origin: at(195, 668), size: [0.24, 0.24], at: 0,
        keys: [{ t: 0, y: -0.7, o: 1 }, { t: 360, y: 0, e: "in" }, { t: 420, y: 0.006, s: 0.97 }, { t: 520, y: 0, s: 1 }, { t: 820, y: -0.75, o: 0, e: "in" }] },
      { kind: "track", shapes: ["seal"], origin: at(195, 700), size: [0.22, 0.22], at: 360,
        keys: [{ t: 0, s: 1.12, o: 0 }, { t: 30, o: 1, e: "hold" }, { t: 200, s: 1 }, { t: 1300, s: 1, o: 1 }, { t: 1650, o: 0 }] },
      { kind: "ring", shapes: ["ringline"], colors: ["#58CC02"], origin: at(195, 700), at: 380, size: [0.5, 0.5], life: [500, 500], opacity: 0.7 },
      sparks(at(195, 700), 400, [LIME, CREAM], 8),
    ],
    sounds: [{ name: "lab-rubber-stamp-1", at: 360, volume: 0.85 }, { name: "lab-save-confirm-1", at: 520, volume: 0.6 }],
    pip: [...SAVED_END, { at: 100, look: [-0.5, 1] }, { at: 420, face: "proud" }, { at: 900, look: "off", body: "lean", face: "warm" }, { at: 1700, body: "nod" }] },
  { id: "rs2-check", name: "Check flies to Pip", ms: 2000,
    feel: "A green check pops out of the Save button with a ring, then flies up in an arc to Pip, who takes it with a warm nod.",
    emitters: [
      { kind: "track", shapes: ["check-badge"], origin: at(195, 780), size: [0.14, 0.14], at: 0,
        keys: [{ t: 0, s: 0 }, { t: 220, s: 1.2, e: "out" }, { t: 320, s: 1 }, { t: 450, s: 1 }, ...flight([[450, 195, 780, 120], [1050, 300, 190, 0]]).slice(1).map(k => ({ ...k, s: 1 - 0.5 * ((k.t - 450) / 600) })), { t: 1250, s: 0.3, o: 0 }] },
      { kind: "ring", shapes: ["ringline"], colors: ["#58CC02"], origin: at(195, 780), at: 60, size: [0.45, 0.45], life: [500, 500], opacity: 0.7 },
      sparks(at(300, 190), 1050, [LIME, CREAM, GOLD], 10),
    ],
    sounds: [{ name: "lab-save-confirm-1", at: 40, volume: 0.7 }, { name: "lab-kalimba-warm-1", at: 1050, volume: 0.6 }],
    pip: [...SAVED_END, { at: 400, look: [-0.6, 1] }, { at: 700, look: [-0.3, 0.6] }, { at: 1050, look: "off", body: "lean" }, { at: 1600, body: "nod" }] },
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
