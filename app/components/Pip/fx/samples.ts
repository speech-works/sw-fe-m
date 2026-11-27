/**
 * Sample moments at the new level (2026-11-28): each option is a whole moment, acted on its real screen, with its own drawn
 * props, background and sounds (an FxEffect: emitters + sounds + Pip's beats). Played by the Moments lab with PipStage.fire().
 *
 * Positions are written in the screen's own points (390 x 844, the screens the lab shows) and turned into screen fractions.
 * Track offsets (FxKey x, y) are fractions of the screen WIDTH.
 * Rules kept: nothing covers Pip's face or collar; props move (enter, act, leave), none stands still beside him.
 */
import type { FxEffect, FxEmitter } from "./types";

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

/** The sample options per moment id (they replace the old options in the lab while the samples are judged). */
export const SAMPLE_MOMENTS: Record<string, FxEffect[]> = {
  "step-done": stepDone,
  "day-done": dayDone,
  "day-closed": nextDay,
};
