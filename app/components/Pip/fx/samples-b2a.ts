/**
 * Moment samples, batch 2 part A (see ./samples.ts for the conventions): practice done, practice ended early, first AI call
 * done, level up, recording problem, home greeting, mood check-in. Three options each; props in ./props-b2a.ts ("a2-...").
 *
 * Positions are in the screen's own points (390 x 844) and turned into screen fractions; track offsets are fractions of the
 * screen WIDTH. Rules kept: nothing covers Pip's face or collar; props enter, act and leave; every hit lands on a sound
 * (see the SYNC note over each option; new sounds are app/assets/sfx/lab/a2-*.m4a, onsets in CREDITS.json).
 */
import type { FxEffect, FxEmitter } from "./types";
import { FXK } from "./library";

const W = 390, H = 844;
const at = (x: number, y: number): [number, number] => [x / W, y / H];
const px = (n: number) => n / W;
const LIME = "#DFFF2E", PINK = "#FF9BD8", GOLD = "#FFC530", SUN = "#FFD84A", OR2 = "#FF7A1A", RED = "#FF2B2B";
const CREAM = "#FFF9E9", BLUE = "#1E7BFF", TEAL = "#2BB3A3", LILAC = "#C4B5FD", GREEN = "#3DDC64", SKIN = "#FFD9B0";
const PARTY = [RED, PINK, LIME, GOLD, BLUE, TEAL, OR2];
/** The flat ground patch under standing props: near-black on the practice sheet, deep violet on the dark screens. */
const SHADE_SHEET = "#100F0D", SHADE_DARK = "#35297A";
type E = FxEmitter;
type K = NonNullable<E["keys"]>[number];
type Pt = [number, number];
const { depth, toss, fall, shell } = FXK;
const END = 99999;

/** One acting prop: a track at a place on the screen (points), `size` in screen widths; key times are from the effect's start. */
const tr = (shape: string, o: Pt, size: number, keys: K[], more: Partial<E> = {}): E =>
  ({ kind: "track", shapes: [shape], origin: at(o[0], o[1]), size: [size, size], at: 0, keys, ...more });
/** Keys with every value written out (a value left out holds the key before's). */
function full(keys: K[]): Required<K>[] {
  let x = 0, y = 0, r = 0, s = 1, o = 1;
  return keys.map(k => ({ t: k.t, x: (x = k.x ?? x), y: (y = k.y ?? y), r: (r = k.r ?? r), s: (s = k.s ?? s), o: (o = k.o ?? o), e: k.e ?? "io" }));
}
/** The same motion, seen only from `a` to `b` ms: for a prop that swaps its drawing (a face that changes, a book that shuts).
 *  `a` and `b` must be key times of the motion (or 0 / END). */
function during(keys: K[], a: number, b: number): K[] {
  const out: K[] = [];
  for (const k of full(keys)) {
    if (k.t < a || k.t > b) out.push({ ...k, o: 0 });
    else if (k.t === a && a > 0) out.push({ ...k, t: a - 1, o: 0 }, { ...k, e: "hold" });
    else if (k.t === b) out.push({ ...k, t: b - 1 }, { ...k, o: 0, e: "hold" });
    else out.push(k);
  }
  return out;
}
/** A part fixed to a moving body: the body's keys with the part's offset (dx, dy: screen widths at scale 1) turned and scaled
 *  with the body, and its own extra turn `rot`. */
const att = (body: K[], dx: number, dy: number, rot = 0): K[] => full(body).map(b => {
  const a = (b.r * Math.PI) / 180;
  return { ...b, x: b.x + b.s * (dx * Math.cos(a) - dy * Math.sin(a)), y: b.y + b.s * (dx * Math.sin(a) + dy * Math.cos(a)), r: b.r + rot };
});
const after = (keys: K[], t: number) => full(keys).filter(k => k.t > t);
const upTo = (keys: K[], t: number) => full(keys).filter(k => k.t <= t);
/** Hops through points: each hop a parabola sampled every ~30 ms. pts: [time, x pt, y pt, arc height pt to the NEXT point]. */
function hops(o: Pt, pts: [number, number, number, number][], tilt = 0): K[] {
  const keys: K[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [ta, xa, ya, h] = pts[i], [tb, xb, yb] = pts[i + 1], n = Math.max(2, Math.round((tb - ta) / 30));
    for (let k = i ? 1 : 0; k <= n; k++) {
      const u = k / n;
      keys.push({ t: Math.round(ta + (tb - ta) * u), x: px(xa + (xb - xa) * u - o[0]), y: px(ya + (yb - ya) * u - 4 * h * u * (1 - u) - o[1]), r: -tilt * Math.sin(Math.PI * u), s: k === n ? 0.93 : 1, e: "lin" });
    }
  }
  return keys;
}
/** The ground patch under a prop that stands at `o` from `t0` to `t1`. */
const ground = (o: Pt, size: number, t0: number, t1: number, color: string): E =>
  tr("a2-ground", o, size, [{ t: 0, s: 0, o: 0 }, { t: t0, s: 0.2, o: 1, e: "hold" }, { t: t0 + 220, s: 1, e: "out" }, { t: t1, s: 1 }, { t: t1 + 180, s: 0.2, o: 0, e: "in" }], { colors: [color] });
/** The ground patch under a prop that moves: it follows the prop's x, stays on the ground line. */
const groundUnder = (body: K[], o: Pt, gy: number, size: number, color: string): E =>
  tr("a2-ground", [o[0], gy], size, full(body).map(k => ({ t: k.t, x: k.x, y: 0, r: 0, s: Math.min(1, k.s), o: k.o, e: k.e })), { colors: [color] });
const sparks = (o: Pt, t: number, colors = [GOLD, LIME, CREAM], n = 10, more: Partial<E> = {}): E => ({
  kind: "burst", shapes: ["sparkle", "glitter", "dot"], colors, origin: at(o[0], o[1]), at: t, count: n, spread: [0, 360], speed: [0.25, 0.6], drag: 3, gravity: 0.1, size: [0.022, 0.045], life: [700, 1100], fadeOut: 400, ...more });
const twinkle = (box: [number, number, number, number], t: number, n: number, colors: string[], stagger = 900): E => ({
  kind: "twinkle", shapes: ["sparkle", "sparkpair"], colors, area: [box[0] / W, box[1] / H, box[2] / W, box[3] / H], count: n, at: t, stagger, size: [0.03, 0.06], life: [500, 900], spin: [10, 40] });
/** Short lines flying out of a hit at `o`. */
const ding = (o: Pt, t: number, size: number, color: string): E =>
  tr("a2-ding", o, size, [{ t: 0, s: 0.5, o: 0 }, { t, s: 0.55, o: 1, e: "hold" }, { t: t + 170, s: 1.1, e: "out" }, { t: t + 380, s: 1.3, o: 0 }], { colors: [color] });
/** A cloud puff that swells and fades at `o`. */
const puff = (o: Pt, t: number, size: number): E =>
  tr("p3-puff", o, size, [{ t: 0, s: 0, o: 0 }, { t, s: 0.2, o: 1, e: "hold" }, { t: t + 160, s: 1, e: "out" }, { t: t + 600, s: 1.25, x: px(-30), y: px(-14), o: 0, e: "out" }]);

// ═════════════ Practice done: the written practice, "Done" pressed (many a day: short) ═════════════
// Pip small in the hero, top right (x 250-388, y 84-204); the sheet below y 204; Done at x 16-374, y 764-820. The prop always
// comes up out of the Done button and stands just over it, so the moment is about what the user just did.
const DONE: Pt = [195, 792];

// A. TO DO sticky gets its check
const TD: Pt = [195, 626], TDS = 0.48;
const todoKeys: K[] = [{ t: 0, y: px(DONE[1] - TD[1]), s: 0, r: -6 }, { t: 60, s: 0.2 }, { t: 300, y: 0, s: 1, e: "back" }, { t: 520, s: 1 }, { t: 570, s: 0.92, y: px(5) }, { t: 740, s: 1, y: 0, e: "back" },
  { t: 900, r: -6, y: 0 }, { t: 1000, r: 4, y: px(-14), e: "out" }, { t: 1110, r: -8, y: 0, e: "in" }, { t: 1210, r: -4, y: px(-8), e: "out" }, { t: 1300, r: -6, y: 0, e: "in" }, { t: 1420, x: 0, s: 1 },
  { t: 1800, x: px(306 - TD[0]), y: px(214 - TD[1]), s: 0.1, r: 24, e: "in" }, { t: 1830, o: 0 }];
const CK: Pt = [0.06 * TDS, 0.13 * TDS];
// B. Desk bell
const BL: Pt = [195, 650], BLS = 0.46;
const bellKeys: K[] = [{ t: 0, s: 0, y: px(100) }, { t: 260, s: 1, y: 0, e: "back" }, { t: 430, s: 1, y: 0 }, { t: 480, s: 0.92, y: px(5) }, { t: 650, s: 1, y: 0, e: "back" },
  { t: 720, r: -6 }, { t: 830, r: 5 }, { t: 930, r: -3 }, { t: 1020, r: 0 }, { t: 1150, s: 1 }, { t: 1240, s: 1.06, e: "out" }, { t: 1420, s: 0, y: px(100), e: "in" }];
const PRESS = 0.05 * BLS;
// C. Toaster
const TS: Pt = [195, 644], TSS = 0.5, POP = 760;
const toasterKeys: K[] = [{ t: 0, s: 0, y: px(110) }, { t: 280, s: 1, y: 0, e: "back" }, { t: 340, r: -2.5 }, { t: 420, r: 2.5 }, { t: 500, r: -2.5 }, { t: 580, r: 2.5 }, { t: 660, r: 0 },
  { t: POP, s: 0.9, y: px(6), e: "in" }, { t: POP + 140, s: 1.05, y: px(-3), e: "out" }, { t: POP + 300, s: 1, y: 0 }, { t: 1560, s: 1 }, { t: 1650, s: 1.05, e: "out" }, { t: 1850, s: 0, y: px(110), e: "in" }];
const toastKeys: K[] = [...att(upTo(toasterKeys, 660), 0, 0.24 * TSS), { t: POP, x: 0, y: 0.24 * TSS + px(6), s: 0.9, r: 0, e: "in" }, { t: POP + 140, y: -0.31 * TSS, s: 1, r: -5, e: "out" },
  { t: POP + 300, y: -0.13 * TSS, r: 0, e: "in" }, { t: POP + 360, y: -0.16 * TSS, e: "out" }, { t: POP + 440, y: -0.13 * TSS }, ...att(after(toasterKeys, POP + 440), 0, -0.13 * TSS)];

const practiceDone: FxEffect[] = [
  // SYNC: the sticky pops out of Done on "pop" (60 ms); the big check lands on the thump of lab-rubber-stamp-1 (520 ms) with a
  // ding right on it (540 ms); the sticky's two happy hops land at 1110 and 1300 ms; it flies up to Pip on the swoosh (1420 ms).
  { id: "pd-todo-check", name: "To-do gets its check", ms: 1900,
    feel: "A yellow TO DO sticky jumps out of the Done button, a fat orange check slams onto it, the note does a happy little dance and flies up to Pip, who nods, proud.",
    emitters: [
      tr("a2-todo", TD, TDS, todoKeys),
      tr("a2-check", TD, TDS * 0.62, [{ t: 0, x: CK[0], y: CK[1] - 0.2 * TDS, s: 2.6, r: -6, o: 0 }, { t: 400, o: 1, e: "hold" }, { t: 520, y: CK[1], s: 1, e: "in" }, ...att(after(todoKeys, 520), CK[0], CK[1])]),
      ding([TD[0] + 12, TD[1] + 10], 520, 0.62, CREAM),
      sparks([TD[0] + 20, TD[1] + 20], 530, [OR2, SUN, CREAM], 10),
    ],
    // founder: "sound does not match animation" -> the check SLAMS on, so a stamp thump + ding on the slam, a boing on each hop
    sounds: [{ name: "pop", at: 60, volume: 0.45 }, { name: "lab-rubber-stamp-1", at: 520, volume: 0.8 }, { name: "ding", at: 540, volume: 0.55 }, { name: "lab-hop-boing-small-1", at: 1110, volume: 0.5 },
      { name: "lab-hop-boing-small-1", at: 1300, volume: 0.45 }, { name: "lab-swoosh-soft-1", at: 1420, volume: 0.4 }],
    pip: [{ at: 0, look: [-0.7, 1], face: "curious" }, { at: 530, face: "proud", body: "nod", haptic: "light" }, { at: 1500, look: "off", face: "smile" }] },
  // SYNC: the finger pushes the button down on the ring of lab-a2-desk-bell-1 (430 ms): the bell squashes, the ding lines fly
  // out and Pip hops on the same beat.
  { id: "pd-desk-bell", name: "Ding! Desk bell", ms: 1500,
    feel: "A gold desk bell with a happy face pops up over the Done button, a finger taps it, DING: lines fly out, the bell wobbles and Pip gives a small hop. Short enough for every practice.",
    emitters: [
      ground([BL[0], BL[1] + 0.37 * BLS * W], BLS * 1.05, 60, 1240, SHADE_SHEET),
      tr("a2-bell-knob", BL, BLS, [...upTo(bellKeys, 260), { t: 380, y: 0 }, { t: 430, y: PRESS, e: "in" }, { t: 480, s: 0.92, y: PRESS + px(5) }, { t: 650, s: 1, y: 0, e: "back" }, ...after(bellKeys, 650)]),
      tr("a2-bell", BL, BLS, bellKeys),
      tr("point", [BL[0] - 11, BL[1] - 0.41 * BLS * W - 32], 0.22, [{ t: 0, y: px(-110), r: 180, o: 0 }, { t: 240, o: 0 }, { t: 290, o: 1 }, { t: 430, y: PRESS, e: "in" }, { t: 500, y: PRESS + px(4) }, { t: 640, y: px(-26), e: "out" }, { t: 900, y: px(-150), o: 0, e: "in" }], { colors: [SKIN] }),
      ding([BL[0], BL[1] - 20], 430, 0.62, SUN), ding([BL[0], BL[1] - 20], 600, 0.5, CREAM),
      sparks([BL[0], BL[1] - 40], 440, [GOLD, SUN, CREAM], 8),
    ],
    sounds: [{ name: "pop", at: 40, volume: 0.4 }, { name: "lab-a2-desk-bell-1", at: 430, volume: 0.85 }],
    pip: [{ at: 0, look: [-0.7, 1], face: "curious" }, { at: 340, face: "smile", body: "hop", haptic: "selection" }, { at: 1150, look: "off" }] },
  // SYNC: two ticks while the toaster shakes (340, 500 ms); the toast jumps on the clack of lab-a2-toaster-pop-1 (760 ms) and
  // the ding of the marimba note comes as it hangs at the top (900 ms).
  { id: "pd-toast", name: "Toast is done", ms: 1950,
    feel: "A little red toaster pops up over the Done button, shakes while it ticks, and POP: a slice of toast with a check browned into it jumps out. Pip laughs. Done!",
    emitters: [
      ground([TS[0], TS[1] + 0.42 * TSS * W], TSS * 1.05, 60, 1650, SHADE_SHEET),
      tr("a2-toaster-back", TS, TSS, toasterKeys),
      tr("a2-toast", TS, TSS, toastKeys),
      tr("a2-toaster", TS, TSS, toasterKeys),
      ding([TS[0], TS[1] - 0.22 * TSS * W], POP + 10, 0.66, CREAM),
      sparks([TS[0], TS[1] - 0.3 * TSS * W], POP + 140, [GOLD, SUN, CREAM], 9),
    ],
    sounds: [{ name: "pop", at: 40, volume: 0.4 }, { name: "tick", at: 340, volume: 0.45 }, { name: "tick", at: 500, volume: 0.45 }, { name: "lab-a2-toaster-pop-1", at: POP, volume: 0.9 }, { name: "lab-a2-marimba-note-1", at: POP + 140, volume: 0.5 }],
    pip: [{ at: 0, look: [-0.7, 1], face: "curious" }, { at: POP - 90, face: "laugh", body: "hop", haptic: "selection" }, { at: 1250, face: "proud", body: "nod" }, { at: 1700, look: "off", face: "smile" }] },
];

// ═════════════ Practice ended early: the user left before the end (no guilt: the place is kept, the door is open) ═════════════
// Same screen. The prop stands on the lower sheet, left of the middle; Pip looks down at it.
// A. The bookmark
const BK: Pt = [165, 556], BKS = 0.46, SHUT = 1000;
const bookKeys: K[] = [{ t: 0, s: 0 }, { t: 300, s: 1, e: "back" }, { t: 700, s: 1, y: 0 }, { t: 750, s: 0.95, y: px(4) }, { t: 900, s: 1, y: 0, e: "back" },
  { t: SHUT, s: 1.12, r: 0 }, { t: SHUT + 170, s: 1, e: "back" }, { t: SHUT + 260, r: -6 }, { t: SHUT + 390, r: 5 }, { t: SHUT + 510, r: -3 }, { t: SHUT + 610, r: 0 },
  { t: 1850, x: 0 }, { t: 1960, x: px(16), r: 3, e: "out" }, { t: 2260, x: px(-340), r: -8, e: "in" }];
// B. The tea-cup car: wheels on the ground line y 706
const CUP: Pt = [185, 628], CUPS = 0.44, CLINK = 780;
const cupKeys: K[] = [{ t: 0, x: px(-340), r: 0 }, { t: 560, x: px(8), r: 4, e: "out" }, { t: 700, x: 0, r: 0 },
  { t: CLINK, r: 0 }, { t: CLINK + 50, r: -5 }, { t: CLINK + 150, r: 0 }, { t: CLINK + 180, r: 0 }, { t: CLINK + 230, r: 5 }, { t: CLINK + 330, r: 0 }, { t: CLINK + 510, r: 0 }, { t: CLINK + 560, r: -4 }, { t: CLINK + 680, r: 0 },
  { t: 1900, x: 0, r: 0 }, { t: 2010, x: px(-18), r: 3, e: "out" }, { t: 2090, x: px(-18), r: 3 }, { t: 2170, x: px(8), r: -6, e: "in" }, { t: 2520, x: px(340), r: -4, e: "lin" }];
// C. The door
const DR: Pt = [150, 552], DRS = 0.5, OPEN = 745;
const doorKeys: K[] = [{ t: 0, s: 0, y: px(60) }, { t: 300, s: 1, y: 0, e: "back" }, { t: 560, r: 0 }, { t: 620, r: -2 }, { t: 690, r: 1.5 }, { t: OPEN, r: 0, s: 1 }, { t: OPEN + 60, s: 1.06 }, { t: OPEN + 285, s: 1, e: "back" },
  { t: 1950, s: 1 }, { t: 2040, s: 1.05, e: "out" }, { t: 2260, s: 0, y: px(60), e: "in" }];

const endedEarly: FxEffect[] = [
  // SYNC: the ribbon drops into the book on lab-envelope-tuck-2 (700 ms); the book shuts on the thud of lab-book-close-2 (1000 ms);
  // the warm kalimba note comes as it settles (1170 ms).
  { id: "pe-bookmark", name: "Bookmark keeps your place", ms: 2350,
    feel: "An open book pops up on the sheet, a lime ribbon drops into it from Pip, the book shuts on it with a happy face, the ribbon's tail still showing, and slides off to wait. Your place is kept. Pip nods, warm.",
    emitters: [
      ground([BK[0], BK[1] + 0.4 * BKS * W], BKS, 60, 1900, SHADE_SHEET),
      tr("a2-book-open", BK, BKS, during(bookKeys, 0, SHUT)),
      tr("a2-ribbon", BK, BKS, [{ t: 0, x: px(300 - BK[0]), y: px(216 - BK[1]), s: 0.3, r: 40, o: 0 }, { t: 350, o: 1, e: "hold" }, { t: 700, x: 0, y: 0, s: 1, r: 0, e: "in" }, { t: 750, s: 0.95, y: px(4) }, { t: 900, s: 1, y: 0, e: "back" }, { t: SHUT - 1, s: 1 }, { t: SHUT, o: 0, e: "hold" }]),
      tr("a2-book-shut", BK, BKS, during(bookKeys, SHUT, END)),
      sparks([BK[0] + 10, BK[1]], SHUT + 20, [LIME, CREAM, SUN], 8),
    ],
    sounds: [{ name: "pop", at: 40, volume: 0.4 }, { name: "lab-swoosh-soft-1", at: 350, volume: 0.35 }, { name: "lab-envelope-tuck-2", at: 700, volume: 0.6 }, { name: "lab-book-close-2", at: SHUT - 40, volume: 0.8 },
      { name: "lab-kalimba-warm-1", at: SHUT + 170, volume: 0.5 }],
    pip: [{ at: 0, look: [-0.8, 1], face: "warm" }, { at: SHUT, body: "nod" }, { at: 1900, look: [-1, 0.8], face: "smile" }, { at: 2200, look: "off" }] },
  // SYNC: the cup rolls in on the swoosh and brakes at 560 ms; the spoon rings three times on lab-a2-spoon-clink-1 (780, 960 and
  // 1290 ms) and the cup rocks on each; it shoots off on lab-ff-zip-1 (2170 ms).
  { id: "pe-tea-break", name: "Tea-cup car", ms: 2650,
    feel: "A blue tea cup on wheels rolls up with a happy face, its spoon rings three times while steam curls up, then it pulls back and putters off in cloud puffs. A break is fine: Pip sways, easy.",
    emitters: [
      groundUnder(cupKeys, CUP, 708, CUPS * 0.95, SHADE_SHEET),
      { kind: "rise", shapes: ["a2-steam"], count: 5, at: 700, stagger: 1000, area: [(CUP[0] - 22) / W, 0, (CUP[0] + 26) / W, (CUP[1] - 40) / H], speed: [0.07, 0.1], sway: 0.012, swayHz: 0.8, size: [0.13, 0.17], life: [800, 1000], upright: true, fadeIn: 200, fadeOut: 500, opacity: 0.8 },
      tr("a2-cupcar", CUP, CUPS, cupKeys),
      ding([CUP[0] + 4, CUP[1] - 30], CLINK, 0.36, CREAM), ding([CUP[0] + 4, CUP[1] - 30], CLINK + 510, 0.36, CREAM),
      puff([CUP[0] - 60, 690], 500, 0.1), puff([CUP[0] - 40, 690], 2190, 0.2), puff([CUP[0] - 6, 676], 2260, 0.16), puff([CUP[0] + 40, 692], 2330, 0.12),
    ],
    sounds: [{ name: "lab-swoosh-soft-2", at: 0, volume: 0.45 }, { name: "lab-a2-spoon-clink-1", at: CLINK, volume: 0.8 }, { name: "lab-ff-zip-1", at: 2170, volume: 0.55 }, { name: "lab-kalimba-warm-1", at: 2300, volume: 0.35 }],
    pip: [{ at: 0, look: [-1, 1], face: "curious" }, { at: 600, look: [-0.6, 1], face: "warm" }, { at: CLINK + 500, body: "sway", face: "smile" }, { at: 2170, look: [0.2, 1] }, { at: 2450, look: "off" }] },
  // SYNC: the door starts to move on the first creak of lab-a2-door-creak-1 (560 ms), swings open on the second (745 ms) and
  // settles on the third (1030 ms), where the soft bell rings and the light sparkles.
  { id: "pe-door-open", name: "Door stays open", ms: 2350,
    feel: "A little teal door pops up asleep, creaks open and wakes with a smile: warm light spills out and sparkles. It stays open. Come back any time: Pip leans in, warm.",
    emitters: [
      tr("a2-door-shut", DR, DRS, during(doorKeys, 0, OPEN)),
      tr("a2-door-ajar", DR, DRS, during(doorKeys, OPEN, END)),
      twinkle([DR[0] + 10, DR[1] - 100, DR[0] + 130, DR[1] + 90], OPEN + 60, 12, [SUN, CREAM, GOLD], 1000),
      sparks([DR[0] + 30, DR[1]], OPEN + 40, [SUN, CREAM, GOLD], 8, { spread: [-60, 60], speed: [0.2, 0.5] }),
    ],
    sounds: [{ name: "pop", at: 40, volume: 0.4 }, { name: "lab-a2-door-creak-1", at: 560, volume: 0.6 }, { name: "lab-soft-bell-1", at: 1030, volume: 0.55 }],
    pip: [{ at: 0, look: [-0.8, 1], face: "curious" }, { at: OPEN, face: "warm", body: "lean" }, { at: 1950, look: "off", face: "smile" }] },
];

// ═════════════ First AI call done: once ever, big, proud and warm (no score) ═════════════
// The stage: Pip on his blob in the middle (x 75-315, y 250-458); the dark screen is free all around.
// A. The cheer choir: five round faces along the bottom
const CH_X = [42, 118, 195, 272, 348], CH_Y = [600, 634, 608, 634, 600], CH_POP = [300, 450, 600, 750, 900], SING = 1400, HUSH = 3300, CHS = 0.25, CH_ORDER = [0, 2, 4, 1, 3];
const choirKeys = (i: number): K[] => [{ t: 0, s: 0, y: px(40) }, { t: CH_POP[i], s: 0.2, y: px(40), e: "hold" }, { t: CH_POP[i] + 220, s: 1, y: 0, e: "back" }, { t: SING - 130, s: 1, y: 0 }, { t: SING - 10, s: 0.9, y: px(5) },
  { t: SING, s: 0.9, y: px(5) }, { t: SING + 130, s: 1.14, y: px(-14), e: "out" }, { t: SING + 320, s: 1, y: 0 },
  ...Array.from({ length: 6 }, (_, j): K => ({ t: SING + 560 + j * 270, r: ((i + j) % 2 ? 1 : -1) * 8, y: px(j % 2 ? 0 : -6) })), { t: HUSH, r: 0, y: 0, s: 1 },
  { t: 3550 + i * 80, s: 1 }, { t: 3640 + i * 80, s: 1.08, e: "out" }, { t: 3830 + i * 80, s: 0, y: px(40), e: "in" }];
// B. The phone: bounces in on the six bounces of lab-a2-bounce-settle-1, then hangs itself up
const PH: Pt = [195, 582], PHS = 0.5, B0 = 250, BOUNCE = [0, 415, 755, 1025, 1250, 1430].map(t => B0 + t), HANG = 2300;
const phoneIn = hops(PH, [[0, -90, PH[1] - 30, 30], [BOUNCE[0], 36, PH[1], 80], [BOUNCE[1], 106, PH[1], 50], [BOUNCE[2], 152, PH[1], 30], [BOUNCE[3], 178, PH[1], 15], [BOUNCE[4], 190, PH[1], 7], [BOUNCE[5], 195, PH[1], 0]], 7);
const phoneKeys: K[] = [...phoneIn, { t: BOUNCE[5] + 120, s: 1, x: 0, y: 0, r: 0 }, { t: HANG, s: 1, y: 0 }, { t: HANG + 50, s: 0.9, y: px(7) }, { t: HANG + 230, s: 1, y: 0, e: "back" },
  { t: HANG + 300, r: -4 }, { t: HANG + 380, r: 4 }, { t: HANG + 460, r: -4 }, { t: HANG + 540, r: 4 }, { t: HANG + 620, r: 0 }, { t: 3700, s: 1 }, { t: 3800, s: 1.06, e: "out" }, { t: 4000, s: 0, y: px(50), e: "in" }];
const handsetKeys: K[] = [...att(upTo(phoneKeys, 1900), 0.015 * PHS, -0.11 * PHS, -20), { t: 2110, x: 0, y: -0.4 * PHS, r: -200, s: 1.05, e: "out" }, { t: HANG, y: 0, r: -360, s: 1, e: "in" }, ...att(after(phoneKeys, HANG), 0, 0, -360)];
// C. The tin-can line
const CAN_Y = 574, CANS = 0.32, CL: Pt = [64, CAN_Y], CR: Pt = [326, CAN_Y], STR = (CR[0] - CL[0]) / W - 2 * 0.385 * CANS, HX = (STR * W) / 2 - 4;
const canKeys = (side: -1 | 1, send: number[], get: number[]): K[] => [
  { t: 0, x: px(side * 150) }, { t: 400, x: 0, e: "out" }, { t: 500, x: px(side * 7), e: "out" }, { t: 640, x: 0, e: "back" },
  ...[...send.map(t => [t, 1] as const), ...get.map(t => [t, 0] as const)].sort((a, b) => a[0] - b[0]).flatMap(([t, isSend]): K[] =>
    isSend ? [{ t: t - 70, s: 0.93, y: 0, r: 0 }, { t, s: 1.1, y: px(-10), r: side * 6, e: "out" }, { t: t + 170, s: 1, y: 0, r: 0 }] : [{ t, s: 1, y: 0, r: 0 }, { t: t + 60, s: 1.1, r: side * -7, e: "out" }, { t: t + 230, s: 1, r: 0, e: "back" }]),
  { t: 2640, s: 0.92, y: 0 }, { t: 2700, s: 0.92, y: px(4) }, { t: 2860, s: 1.08, y: px(-30), r: side * 10, e: "out" }, { t: 3040, s: 1, y: 0, r: 0, e: "in" }, { t: 3100, s: 0.95 }, { t: 3240, s: 1, e: "back" },
  { t: 4150, x: 0 }, { t: 4450, x: px(side * 160), e: "in" }];
/** The string: straight, or shaking between its two wave shapes while something travels along it. */
const SHAKE: [number, number][] = [[500, 900], [1100, 1700], [1900, 2500], [2700, 3150]];
const stringKeys = (which: 0 | 1 | 2): K[] => {
  const marks: [number, number][] = [[400, 0]];
  for (const [a, b] of SHAKE) { for (let t = a, n = 0; t < b; t += 70, n++) marks.push([t, 1 + (n % 2)]); marks.push([b, 0]); }
  return [{ t: 0, o: 0 }, ...marks.map(([t, st]): K => ({ t, o: st === which ? 1 : 0, e: "hold" })), { t: 4150, o: which === 0 ? 1 : 0, e: "hold" }, { t: 4200, o: 0 }];
};
const heartTrip = (t0: number, from: -1 | 1, size: number): E =>
  tr("p3-heart", [195, CAN_Y - 2], size, [{ t: 0, x: px(from * HX), y: 0, s: 0.2, o: 0 }, { t: t0, o: 1, e: "hold" }, { t: t0 + 110, s: 1, y: px(-12), x: px(from * (HX - 16)), e: "out" },
    { t: t0 + 300, x: 0, y: px(-20), e: "lin" }, { t: t0 + 500, x: px(-from * (HX - 16)), y: px(-12), e: "lin" }, { t: t0 + 600, x: px(-from * HX), y: 0, s: 0.25, e: "in" }, { t: t0 + 610, o: 0, e: "hold" }]);

const firstCall: FxEffect[] = [
  // SYNC: the five faces pop up on pop / boop / pop / boop / pop (300, 450, 600, 750, 900 ms); they crouch, then all the mouths
  // open on the chord of lab-a2-choir-1 (1400 ms) as the first cannon fires (lab-cannon-confetti-1, 1400 ms), the second at
  // 1620 ms; Pip leaves the blob on the chord (his jump starts at 1260 ms).
  { id: "fc-cheer-choir", name: "Cheer choir", ms: 4200,
    feel: "Five round faces pop up in a row under Pip, one after another, take a breath and burst into song with huge open mouths: confetti cannons fire from both sides, notes float up and Pip jumps for joy. Your first call, and everybody heard it.",
    emitters: [
      ...CH_ORDER.map(i => ground([CH_X[i], CH_Y[i] + 0.46 * CHS * W], CHS * 0.9, CH_POP[i], 3550 + i * 80, SHADE_DARK)),
      ...CH_ORDER.flatMap((i): E[] => { const o: Pt = [CH_X[i], CH_Y[i]], k = choirKeys(i); return [
        tr(`a2-ch${i}-shut`, o, CHS, during(k, 0, SING)), tr(`a2-ch${i}-open`, o, CHS, during(k, SING, HUSH)), tr(`a2-ch${i}-shut`, o, CHS, during(k, HUSH, END))]; }),
      ...depth(toss({ at: SING, origin: [-0.03, 0.66], spread: [-86, -66], speed: [1.5, 2.6], drag: 1.5, gravity: 0.55, life: [2100, 2600] }), 34),
      ...depth(toss({ at: SING + 220, origin: [1.03, 0.66], spread: [-114, -94], speed: [1.5, 2.6], drag: 1.5, gravity: 0.55, life: [2100, 2600] }), 34),
      ...[[0.02, 0.2], [0.8, 0.98]].map(([x0, x1]): E => ({ kind: "rise", shapes: ["note", "notes"], colors: [PINK, LIME, GOLD, CREAM], count: 4, at: SING + 150, stagger: 1300, area: [x0, 0, x1, 0.68], speed: [0.16, 0.26], sway: 0.02, size: [0.06, 0.09], life: [1300, 1600], upright: true, fadeIn: 150, fadeOut: 500 })),
    ],
    sounds: [{ name: "pop", at: 300, volume: 0.5 }, { name: "boop", at: 450, volume: 0.5 }, { name: "pop", at: 600, volume: 0.55 }, { name: "boop", at: 750, volume: 0.55 }, { name: "pop", at: 900, volume: 0.6 },
      { name: "lab-a2-choir-1", at: SING, volume: 0.9 }, { name: "lab-cannon-confetti-1", at: SING, volume: 0.7 }, { name: "lab-cannon-confetti-2", at: SING + 220, volume: 0.65 }, { name: "lab-cheer-short-1", at: SING + 500, volume: 0.5 }],
    pip: [{ at: 0, look: [-0.9, 1], face: "curious" }, { at: 600, look: [0, 1] }, { at: 900, look: [0.9, 1], face: "smile" }, { at: SING - 140, look: "off", body: "bighop", face: "laugh" }, { at: SING + 380, haptic: "success" },
      { at: 2300, body: "bounce", face: "proud" }, { at: HUSH, face: "warm", body: "nod" }] },
  // SYNC: the phone lands on each of the six bounces of lab-a2-bounce-settle-1 (250, 665, 1005, 1275, 1500, 1680 ms); the handset
  // jumps on lab-hop-boing-small-1 (1900 ms) and lands on the cradle on the clack of lab-a2-phone-hangup-1 (2300 ms), where the
  // confetti fires (lab-cannon-confetti-1) and Pip leaves the blob; the two fireworks open on their pops (2850, 3200 ms).
  { id: "fc-hang-up-party", name: "Hang-up party", ms: 4200,
    feel: "A red phone with a happy face bounces in, each bounce smaller, its handset still off the hook. The handset flips up, lands on the cradle with a clack, and the call is DONE: confetti bursts out of the phone, two fireworks open overhead and Pip jumps.",
    emitters: [
      groundUnder(phoneKeys, PH, PH[1] + 0.37 * PHS * W, PHS * 0.95, SHADE_DARK),
      tr("a2-phone", PH, PHS, phoneKeys),
      tr("a2-handset", PH, PHS, handsetKeys),
      ding([PH[0], PH[1] - 0.12 * PHS * W], HANG, 0.62, SUN),
      toss({ at: HANG + 20, origin: at(PH[0] - 50, PH[1] - 30), spread: [-165, -118], speed: [0.9, 1.7], count: 24 }),
      toss({ at: HANG + 20, origin: at(PH[0] + 50, PH[1] - 30), spread: [-62, -15], speed: [0.9, 1.7], count: 26 }),
      ...shell(0.2, 0.15, 2850, [GOLD, SUN, OR2], "back", 16), ...shell(0.8, 0.12, 3200, [PINK, LIME, CREAM], "back", 16),
    ],
    sounds: [{ name: "lab-a2-bounce-settle-1", at: B0, volume: 0.75 }, { name: "lab-hop-boing-small-1", at: 1900, volume: 0.6 }, { name: "lab-a2-phone-hangup-1", at: HANG - 20, volume: 0.95 },
      { name: "lab-cannon-confetti-1", at: HANG + 20, volume: 0.75 }, { name: "lab-cheer-short-1", at: HANG + 250, volume: 0.6 }, { name: "lab-firework-launch-1", at: 2470, volume: 0.45 },
      { name: "lab-firework-pop-1", at: 2850, volume: 0.7 }, { name: "lab-firework-pop-2", at: 3200, volume: 0.7 }],
    pip: [{ at: 0, look: [-1, 1], face: "curious" }, { at: BOUNCE[2], look: [-0.3, 1] }, { at: BOUNCE[5], look: [0, 1], face: "smile" }, { at: 1900, look: [0, 0.6] }, { at: HANG - 140, look: "off", body: "bighop", face: "laugh" },
      { at: HANG + 380, haptic: "success" }, { at: 2900, look: [-0.5, -1], face: "proud" }, { at: 3250, look: [0.5, -1], body: "pop" }, { at: 3800, look: "off", face: "warm" }] },
  // SYNC: the string snaps tight on lab-a2-twang-1 (500 ms); a heart leaves the left can on heart-blip (1100 ms) and lands in the
  // right one on boop (1700 ms); a bigger heart comes back (heart-blip 1900 ms, boop 2500 ms); both cans jump and the hearts
  // and gold come on the first note of lab-harp-gliss-1 (2700 ms).
  { id: "fc-tin-can-line", name: "Tin-can line", ms: 4750,
    feel: "Two tin cans with happy faces slide in on a string that snaps tight under Pip. A heart travels down the line to the other can, a bigger one comes back, then both cans jump and hearts and gold pour out. You called and somebody answered: Pip makes heart hands.",
    emitters: [
      ground([CL[0], CAN_Y + 0.25 * CANS * W], CANS, 400, 4150, SHADE_DARK), ground([CR[0], CAN_Y + 0.25 * CANS * W], CANS, 400, 4150, SHADE_DARK),
      tr("a2-string", [195, CAN_Y], STR, stringKeys(0)), tr("a2-string-w1", [195, CAN_Y], STR, stringKeys(1)), tr("a2-string-w2", [195, CAN_Y], STR, stringKeys(2)),
      heartTrip(1100, -1, 0.13), heartTrip(1900, 1, 0.18),
      tr("a2-can-l", CL, CANS, canKeys(-1, [1100], [2500])), tr("a2-can-r", CR, CANS, canKeys(1, [1900], [1700])),
      ...[CL, CR].map((c, i): E => ({ kind: "burst", upright: true, shapes: ["heart"], colors: [RED, PINK, "#FF6FA8"], origin: at(c[0], c[1] - 30), at: 2760, count: 9, stagger: 500, spread: i ? [-84, -58] : [-122, -96],
        speed: [0.5, 1.0], drag: 1.6, gravity: 0.1, size: [0.045, 0.08], life: [1300, 1700], fadeIn: 80, fadeOut: 500 })),
      ...depth(fall({ at: 2750, shapes: ["sparkle", "glitter", "sparkle"], colors: [GOLD, SUN, CREAM], speed: [0.28, 0.44], gravity: 0.06, sway: 0.02, spin: [30, 120], size: [0.03, 0.055], life: [1700, 1900], stagger: 700, flip: false }), 40),
    ],
    sounds: [{ name: "lab-swoosh-soft-2", at: 0, volume: 0.45 }, { name: "lab-a2-twang-1", at: 500, volume: 0.8 }, { name: "heart-blip", at: 1100, volume: 0.6 }, { name: "boop", at: 1700, volume: 0.55 },
      { name: "heart-blip", at: 1900, volume: 0.65 }, { name: "boop", at: 2500, volume: 0.6 }, { name: "lab-harp-gliss-1", at: 2700, volume: 0.75 }, { name: "lab-stars-twinkle-1", at: 3100, volume: 0.35 }],
    pip: [{ at: 0, look: [-1, 1], face: "curious" }, { at: 420, look: [1, 1] }, { at: 760, move: "h-heart" }, { at: 1100, look: [-0.8, 1] }, { at: 1400, look: [0, 1] }, { at: 1700, look: [0.8, 1] },
      { at: 2200, look: [0, 1] }, { at: 2500, look: [-0.8, 1] }, { at: 2700, look: "off", haptic: "success" }] },
];

// ═════════════ Level up (weekly, medium) / a new stage (4 times ever, big) ═════════════
// The stage. The founder liked "Pip jumps": every option gives the jump a reason and a sound on the beat.
// A. The bonus block over his head. bighop: he leaves the blob 140 ms in, is at the top at 350 ms, lands at 520 ms.
const JUMP = 420, BUMP = JUMP + 350, LAND = JUMP + 520, BLK: Pt = [195, 200], BLKS = 0.3;
const blockKeys: K[] = [{ t: 0, s: 0, y: px(-30) }, { t: 240, s: 1, y: 0, e: "back" }, { t: BUMP - 10, y: 0, s: 1 }, { t: BUMP + 70, y: px(-20), s: 1.06, e: "out" }, { t: BUMP + 240, y: 0, s: 1, e: "in" }, { t: BUMP + 300, y: px(3) }, { t: BUMP + 400, y: 0 },
  { t: 1750, s: 1 }, { t: 1840, s: 1.08, e: "out" }, { t: 2020, s: 0, e: "in" }];
// B. The ladder, a piece per marimba note
const LD_X = 40, LD_FOOT = 610, LDS = 0.23, LD_AT = 420, RUNG = [0, 190, 380, 570].map(t => LD_AT + t), TOPPER = LD_AT + 800, LD_PIECE = LDS * W;
// C. The star row
const ST_X = [72, 154, 236, 318], ST_Y = 592, STS = 0.22, FLY = 320, SLOT = 900, WAVE = 1180, ALL = 1760;
const rowStar = (i: number, born: number): K[] => [{ t: 0, s: 0, o: 0 }, { t: born, s: 0.2, o: 1, e: "hold" }, { t: born + 220, s: 1, e: "back" },
  { t: WAVE + i * 110 - 60, s: 0.93, y: 0 }, { t: WAVE + i * 110, s: 0.93, y: px(3) }, { t: WAVE + i * 110 + 110, s: 1.1, y: px(-26), r: 10, e: "out" }, { t: WAVE + i * 110 + 260, s: 1, y: 0, r: 0, e: "in" },
  { t: ALL - 110, s: 1, y: 0 }, { t: ALL, s: 0.9, y: px(4) }, { t: ALL + 170, s: 1.12, y: px(-40), r: -12, e: "out" }, { t: ALL + 380, s: 1, y: 0, r: 0, e: "in" }, { t: ALL + 430, s: 0.94 }, { t: ALL + 560, s: 1, e: "back" },
  { t: 2450 + i * 70, s: 1 }, { t: 2540 + i * 70, s: 1.1, e: "out" }, { t: 2720 + i * 70, s: 0, e: "in" }];

const levelUp: FxEffect[] = [
  // SYNC: the block pops in on "pop" (40 ms); Pip leaves the blob on lab-hop-boing-small-2 (560 ms); his head bumps the block at
  // the top of the jump on lab-medal-ding-1 (770 ms): the block jumps, the star springs out; he lands on the pat of lab-grip-pat-2
  // (940 ms); the star's sparkle is "sparkle" (1250 ms).
  { id: "lu-bonus-block", name: "Pip bumps the block", ms: 2450,
    feel: "A gold bonus block with a happy face pops in over Pip's head. He looks up, squats and jumps: BONK, the block jumps and a gold star springs out of it, spins and flies off. New stage: three blocks, three stars, a fanfare and a golden shower.",
    emitters: [
      tr("a2-star", BLK, 0.24, [{ t: 0, s: 0, o: 0 }, { t: BUMP, s: 0.3, o: 1, y: px(-10), e: "hold" }, { t: BUMP + 260, s: 1.15, y: px(-116), r: 0, e: "out" }, { t: BUMP + 380, s: 1, y: px(-108) }, { t: BUMP + 800, y: px(-116), r: 360, e: "io" },
        { t: 1750, y: px(-108), s: 1 }, { t: 2050, x: px(120), y: px(-260), s: 0.5, r: 540, e: "in" }]),
      tr("a2-block", BLK, BLKS, blockKeys),
      ding([BLK[0], BLK[1] + 6], BUMP, 0.62, CREAM),
      sparks([BLK[0], BLK[1] - 56], BUMP + 40, [GOLD, SUN, CREAM], 14, { speed: [0.3, 0.75] }),
      twinkle([90, 20, 300, 140], BUMP + 300, 7, [GOLD, SUN, CREAM], 800),
      ...[[0.02, 0.17], [0.83, 0.98]].map(([x0, x1]): E => ({ kind: "rise", shapes: ["sparkle", "star"], colors: [GOLD, LIME, CREAM], count: 5, at: LAND, stagger: 500, area: [x0, 0, x1, 0.6], speed: [0.3, 0.5], size: [0.03, 0.055], life: [800, 1100], spin: [40, 120], fadeOut: 400 })),
    ],
    sounds: [{ name: "pop", at: 40, volume: 0.45 }, { name: "lab-hop-boing-small-2", at: JUMP + 140, volume: 0.7 }, { name: "lab-medal-ding-1", at: BUMP, volume: 0.85 }, { name: "lab-grip-pat-2", at: LAND - 60, volume: 0.6 }, { name: "sparkle", at: 1250, volume: 0.35 }],
    pip: [{ at: 0, face: "smile" }, { at: 200, look: [0, -1] }, { at: JUMP, body: "bighop" }, { at: BUMP, face: "laugh" }, { at: LAND, haptic: "success" }, { at: 1280, body: "pop", face: "proud" }, { at: 1800, look: [0.6, -1] }, { at: 2100, look: "off", face: "warm" }] },
  // SYNC: the hole opens on "pop" (60 ms); the four ladder pieces shoot up on the four rising notes of lab-a2-marimba-climb-1
  // (420, 610, 800, 990 ms) and the star lands on top on its high fifth note (1220 ms), where Pip hops.
  { id: "lu-ladder", name: "Ladder, one rung up", ms: 3100,
    feel: "A hole opens beside Pip and a ladder climbs out of it, piece by piece, each on a higher note; a gold star lands on top. Pip's eyes climb with it and he hops at the top. New stage: the ladder goes on out of the top of the screen and fireworks open.",
    emitters: [
      tr("a2-hole", [LD_X + 4, LD_FOOT], 0.34, [{ t: 0, s: 0 }, { t: 60, s: 0 }, { t: 300, s: 1, e: "back" }, { t: 2750, s: 1 }, { t: 2950, s: 0, e: "in" }]),
      ...RUNG.map((t, i) => tr("a2-ladder", [LD_X, LD_FOOT - LD_PIECE * (i + 0.5)], LDS, [{ t: 0, s: 1, y: px(LD_PIECE), o: 0 }, { t, o: 1, e: "hold" }, { t: t + 150, y: 0, e: "back" },
        { t: 2400 + (3 - i) * 90, y: 0 }, { t: 2400 + (3 - i) * 90 + 110, y: px(LD_PIECE), e: "in" }, { t: 2400 + (3 - i) * 90 + 111, o: 0, e: "hold" }])),
      tr("a2-star", [LD_X + 2, LD_FOOT - LD_PIECE * 4 - 26], 0.23, [{ t: 0, s: 0.4, y: px(-120), x: px(40), r: -200, o: 0 }, { t: TOPPER - 240, o: 1, e: "hold" }, { t: TOPPER, s: 1.25, x: 0, y: 0, r: 0, e: "in" }, { t: TOPPER + 140, s: 1, e: "out" },
        { t: TOPPER + 300, r: -12 }, { t: TOPPER + 450, r: 10 }, { t: TOPPER + 600, r: -6 }, { t: TOPPER + 720, r: 0 }, { t: 2280, s: 1 }, { t: 2330, s: 1.15, e: "out" }, { t: 2420, s: 0, e: "in" }]),
      ...RUNG.map((t, i) => sparks([LD_X, LD_FOOT - LD_PIECE * (i + 1)], t + 120, [GOLD, CREAM], 3, { size: [0.018, 0.03], life: [350, 500] })),
      sparks([LD_X + 2, LD_FOOT - LD_PIECE * 4 - 26], TOPPER, [GOLD, SUN, CREAM, LIME], 14, { speed: [0.3, 0.7] }),
      ding([LD_X + 2, LD_FOOT - LD_PIECE * 4 - 26], TOPPER, 0.42, SUN),
    ],
    sounds: [{ name: "pop", at: 60, volume: 0.4 }, { name: "lab-a2-marimba-climb-1", at: LD_AT, volume: 0.9 }, { name: "sparkle", at: TOPPER + 30, volume: 0.4 }, { name: "lab-ff-zip-1", at: 2400, volume: 0.4 }],
    pip: [{ at: 0, face: "curious", look: [-1, 1] }, { at: RUNG[1], look: [-1, 0.4] }, { at: RUNG[2], look: [-1, -0.2] }, { at: RUNG[3], look: [-1, -0.7] },
      { at: TOPPER - 90, face: "laugh", body: "hop", haptic: "success" }, { at: 1800, look: "off", face: "proud", body: "nod" }, { at: 2750, face: "warm" }] },
  // SYNC: the new star hits its empty place on lab-medal-ding-1 (900 ms); the four stars hop one after another on the four quick
  // notes of lab-a2-marimba-wave-1 (1180, 1290, 1400, 1510 ms); all four and Pip leave the ground together on chime-up (1760 ms).
  { id: "lu-star-row", name: "A new star in the row", ms: 2950,
    feel: "Three gold stars with faces and one empty place line up under Pip. A new star shoots in from the top corner and drops into the gap with a ding; the row does a wave, then all four stars and Pip jump together. New stage: the whole row turns into a star shower with a fanfare.",
    emitters: [
      tr("a2-star-slot", [ST_X[3], ST_Y], STS, [{ t: 0, s: 0 }, { t: 200, s: 0 }, { t: 420, s: 1, e: "back" }, { t: SLOT - 1, s: 1 }, { t: SLOT, o: 0, e: "hold" }]),
      ...[0, 1, 2].map(i => tr("a2-star", [ST_X[i], ST_Y], STS, rowStar(i, i * 100))),
      tr("a2-star", [ST_X[3], ST_Y], STS, [{ t: 0, x: px(430 - ST_X[3]), y: px(40 - ST_Y), s: 0.5, r: -300, o: 0 }, { t: FLY, o: 1, e: "hold" }, { t: FLY + 300, x: px(366 - ST_X[3]), y: px(250 - ST_Y), s: 0.8, r: -160, e: "lin" },
        { t: SLOT, x: 0, y: 0, s: 1.25, r: 0, e: "lin" }, { t: SLOT + 150, s: 1, e: "out" }, ...rowStar(3, 0).filter(k => k.t > SLOT + 150)]),
      ...[0, 1, 2, 3].map(j => sparks([430 - j * 30, 40 + j * 130], FLY + j * 140, [GOLD, SUN, CREAM], 3, { size: [0.016, 0.032], life: [400, 600], speed: [0.05, 0.2] })),
      { kind: "ring", shapes: ["p3-ripple"], colors: [SUN], origin: at(ST_X[3], ST_Y + 20), at: SLOT, size: [0.4, 0.4], life: [500, 500], opacity: 0.8 },
      sparks([ST_X[3], ST_Y], SLOT, [GOLD, SUN, CREAM, LIME], 14, { speed: [0.3, 0.7] }),
      twinkle([30, 520, 360, 640], ALL + 150, 8, [GOLD, SUN, CREAM], 500),
    ],
    sounds: [{ name: "pop", at: 20, volume: 0.4 }, { name: "lab-swoosh-soft-2", at: FLY, volume: 0.45 }, { name: "lab-medal-ding-1", at: SLOT, volume: 0.85 }, { name: "lab-a2-marimba-wave-1", at: WAVE, volume: 0.75 }, { name: "chime-up", at: ALL, volume: 0.6 }],
    pip: [{ at: 0, face: "smile", look: [0, 1] }, { at: FLY, look: [1, -1], face: "curious" }, { at: FLY + 300, look: [1, 0.3] }, { at: SLOT, look: [0.7, 1], face: "laugh", haptic: "light" }, { at: WAVE, look: [-0.7, 1] }, { at: WAVE + 330, look: [0.7, 1] },
      { at: ALL - 140, look: "off", body: "bighop", face: "proud" }, { at: ALL + 380, haptic: "success" }, { at: 2500, face: "warm" }] },
];

// ═════════════ Recording problem: the mic or the recording failed (never the user's fault; calm and helpful) ═════════════
// The stage. The mic is a little character with its own bad moment: Pip looks at IT, kindly.
const MIC: Pt = [195, 614], MICS = 0.48, MIC_G: Pt = [195, 614 + 0.44 * 0.48 * W];
// A. Tap tap: three taps on the three knocks of lab-a2-mic-tap-1
const TAP = [520, 820, 1105], SHAKE_AT = 1400, OKAY = 1800;
const micTapKeys: K[] = [{ t: 0, s: 0, y: px(60) }, { t: 280, s: 1, y: 0, e: "back" }, ...TAP.flatMap((t): K[] => [{ t, r: 0, x: 0 }, { t: t + 50, r: -7, x: px(-7), e: "out" }, { t: t + 220, r: 0, x: 0, e: "back" }]),
  { t: SHAKE_AT, r: 0 }, ...[9, -9, 7, -6, 4].map((r, j): K => ({ t: SHAKE_AT + 70 + j * 75, r, e: "lin" })), { t: OKAY, r: 0, s: 1 }, { t: OKAY + 60, s: 1.08 }, { t: OKAY + 240, s: 1, e: "back" },
  { t: 2450, s: 1 }, { t: 2540, s: 1.05, e: "out" }, { t: 2740, s: 0, y: px(60), e: "in" }];
const TIP: Pt = [MIC[0] + 0.24 * MICS * W + 34, MIC[1] - 0.22 * MICS * W - 12];
// B. The plug and the socket
const PLUG_Y = 596, PLS = 0.36, PLUG0: Pt = [104, PLUG_Y], SOCK: Pt = [272, PLUG_Y], JOIN = 860, TRAVEL = SOCK[0] - 0.26 * PLS * W - (PLUG0[0] + 0.26 * PLS * W);
const plugKeys: K[] = [{ t: 0, x: px(-170) }, { t: 380, x: 0, e: "out" }, { t: 460, s: 0.94, y: 0 }, { t: 520, s: 0.94, y: px(3) }, { t: 690, x: px(TRAVEL * 0.5), y: px(-30), r: -10, s: 1, e: "out" }, { t: JOIN, x: px(TRAVEL), y: 0, r: 0, e: "in" },
  { t: JOIN + 50, x: px(TRAVEL + 5) }, { t: JOIN + 180, x: px(TRAVEL), e: "back" }, { t: 1150, y: 0 }, { t: 1250, y: px(-8), e: "out" }, { t: 1370, y: 0, e: "in" }, { t: 1950, o: 1, y: 0 }, { t: 2250, o: 0, y: px(22), e: "in" }];
const sockKeys: K[] = [{ t: 0, x: px(170) }, { t: 380, x: 0, e: "out" }, { t: JOIN, x: 0 }, { t: JOIN + 50, x: px(6) }, { t: JOIN + 190, x: 0, e: "back" }, { t: 1150, y: 0 }, { t: 1250, y: px(-8), e: "out" }, { t: 1370, y: 0, e: "in" }, { t: 1950, o: 1, y: 0 }, { t: 2250, o: 0, y: px(22), e: "in" }];
// C. The mic dozed off
const WAKE = 1700, CALM = 2160;
const micNapKeys: K[] = [{ t: 0, s: 0, y: px(60) }, { t: 280, s: 1, y: 0, e: "back" }, { t: 400, s: 1, r: 4 }, { t: 800, s: 1.05, r: 6 }, { t: 1150, s: 1, r: 4 }, { t: 1500, s: 1.05, r: 6 }, { t: WAKE, s: 1, r: 5, y: 0 },
  { t: WAKE + 110, y: px(-18), s: 1.08, r: 0, e: "out" }, { t: WAKE + 280, y: 0, s: 1, e: "in" }, { t: WAKE + 330, s: 0.93 }, { t: CALM, s: 1, r: 0, e: "back" },
  { t: CALM + 60, r: 8 }, { t: CALM + 140, r: -8 }, { t: CALM + 220, r: 5 }, { t: CALM + 300, r: 0 }, { t: 2700, s: 1 }, { t: 2790, s: 1.05, e: "out" }, { t: 2980, s: 0, y: px(60), e: "in" }];
const zed = (t: number, i: number): E => ({ kind: "burst", shapes: ["zed"], colors: [LILAC, CREAM, LILAC], origin: at(MIC[0] + 64, MIC[1] - 92), at: t, count: 1, spread: [-58 + i * 6, -58 + i * 6], speed: [0.16 + i * 0.04, 0.16 + i * 0.04], drag: 1.1, gravity: -0.03,
  size: [0.05 + i * 0.022, 0.05 + i * 0.022], life: [900, 900], fadeIn: 150, fadeOut: 450, upright: true });

const recProblem: FxEffect[] = [
  // SYNC: the finger taps the mic on the three knocks of lab-a2-mic-tap-1 (520, 820, 1105 ms): each tap jolts the mic, and it
  // goes "o"; it shakes itself on lab-a2-cartoon-shake-1 (1400 ms); the smile and the green check come on boop (1800 ms) and
  // the soft bell (1850 ms).
  { id: "rp-tap-tap", name: "Tap tap, is this on?", ms: 2800,
    feel: "A little microphone pops up under Pip. A finger taps it three times (tap, tap, tap), the mic goes \"o!\" with big eyes, shakes itself awake, smiles and shows a green check: ready for one more go. Pip listens, then nods, warm. The mic had the problem, not you.",
    emitters: [
      ground(MIC_G, MICS * 0.8, 60, 2540, SHADE_DARK),
      tr("a2-mic", MIC, MICS, during(micTapKeys, 0, TAP[0])), tr("a2-mic-o", MIC, MICS, during(micTapKeys, TAP[0], OKAY)), tr("a2-mic", MIC, MICS, during(micTapKeys, OKAY, END)),
      tr("point", TIP, 0.22, [{ t: 0, x: px(170), r: -90, o: 0 }, { t: 300, x: px(120), o: 0 }, { t: 440, x: px(34), o: 1, e: "out" }, ...TAP.flatMap((t): K[] => [{ t: t - 60, x: px(34) }, { t, x: 0, e: "in" }, { t: t + 130, x: px(30), e: "out" }]),
        { t: 1300, x: px(34) }, { t: 1520, x: px(190), o: 0, e: "in" }], { colors: [SKIN] }),
      ...TAP.map(t => sparks([TIP[0] - 38, TIP[1] + 10], t, [CREAM, SUN], 4, { size: [0.016, 0.03], life: [300, 450], speed: [0.15, 0.35] })),
      tr("a2-ok", [MIC[0] + 0.36 * MICS * W, MIC[1] - 0.36 * MICS * W], 0.16, [{ t: 0, s: 0, o: 0 }, { t: OKAY + 50, s: 0.3, o: 1, e: "hold" }, { t: OKAY + 190, s: 1.2, e: "out" }, { t: OKAY + 290, s: 1 }, { t: 2450, s: 1 }, { t: 2600, s: 0, e: "in" }]),
      sparks([MIC[0] + 0.36 * MICS * W, MIC[1] - 0.36 * MICS * W], OKAY + 100, [GREEN, LIME, CREAM], 7),
    ],
    sounds: [{ name: "pop", at: 40, volume: 0.4 }, { name: "lab-a2-mic-tap-1", at: TAP[0], volume: 0.9 }, { name: "lab-a2-cartoon-shake-1", at: SHAKE_AT, volume: 0.55 }, { name: "boop", at: OKAY, volume: 0.5 }, { name: "lab-soft-bell-1", at: OKAY + 50, volume: 0.45 }],
    pip: [{ at: 0, look: [0, 1], face: "curious" }, { at: SHAKE_AT, face: "listening" }, { at: OKAY + 50, face: "warm", body: "nod" }, { at: 2500, look: "off" }] },
  // SYNC: the plug hops on lab-hop-boing-small-2 (520 ms) and goes into the socket on the click of lab-a2-plug-in-1 (860 ms),
  // where the sparks fly; the green check pops on lab-save-confirm-2 (1150 ms) and the two do a small jump together.
  { id: "rp-plugged-in", name: "Plugged back in", ms: 2350,
    feel: "A lime plug and a pink socket slide in on their cables, a gap between them. The plug takes a little run-up, hops and clicks into the socket: sparks, a green check, and the two do a happy jump. Just a loose cable. One more go when you like: Pip nods, warm.",
    emitters: [
      tr("a2-cable-l", [PLUG0[0] - 0.24 * PLS * W - 97, PLUG_Y], 0.5, plugKeys), tr("a2-cable-r", [SOCK[0] + 0.24 * PLS * W + 97, PLUG_Y], 0.5, sockKeys),
      tr("a2-plug", PLUG0, PLS, plugKeys), tr("a2-socket", SOCK, PLS, sockKeys),
      sparks([SOCK[0] - 0.26 * PLS * W, PLUG_Y], JOIN, [SUN, LIME, CREAM, PINK], 14, { speed: [0.3, 0.7] }),
      { kind: "burst", shapes: ["bolt"], colors: [SUN, GOLD], origin: at(SOCK[0] - 0.26 * PLS * W, PLUG_Y - 10), at: JOIN, count: 3, spread: [-150, -30], speed: [0.35, 0.55], drag: 2.4, gravity: 0.3, size: [0.05, 0.075], life: [600, 800], tilt: [-20, 20], fadeOut: 300 },
      tr("a2-ok", [SOCK[0] - 0.26 * PLS * W, PLUG_Y - 84], 0.17, [{ t: 0, s: 0, o: 0 }, { t: 1150, s: 0.3, o: 1, e: "hold" }, { t: 1290, s: 1.2, e: "out" }, { t: 1390, s: 1 }, { t: 1950, s: 1 }, { t: 2120, s: 0, e: "in" }]),
    ],
    sounds: [{ name: "lab-swoosh-soft-2", at: 0, volume: 0.4 }, { name: "lab-hop-boing-small-2", at: 520, volume: 0.6 }, { name: "lab-a2-plug-in-1", at: JOIN, volume: 0.95 }, { name: "lab-save-confirm-2", at: 1150, volume: 0.6 }],
    pip: [{ at: 0, look: [-0.8, 1], face: "curious" }, { at: 520, look: [-0.2, 1] }, { at: JOIN, look: [0.2, 1], face: "smile" }, { at: 1150, face: "warm", body: "nod" }, { at: 1950, look: "off" }] },
  // SYNC: the mic snores on lab-a2-snore-1 (380 and 1080 ms, a "z" floats up with each); it wakes with a jump on
  // lab-a2-squeak-1 (1700 ms), its nightcap flying off; it settles into a smile on boop (2160 ms).
  { id: "rp-mic-dozed-off", name: "The mic dozed off", ms: 3050,
    feel: "The microphone pops up fast asleep in a nightcap, snoring z's. Pip leans in to look, and the mic wakes with a jump and a squeak: big eyes, the nightcap flies off, then a sheepish smile and a little shake. It nodded off, that is all. Pip smiles and nods.",
    emitters: [
      ground(MIC_G, MICS * 0.8, 60, 2790, SHADE_DARK),
      tr("a2-mic-sleep", MIC, MICS, during(micNapKeys, 0, WAKE)), tr("a2-mic-o", MIC, MICS, during(micNapKeys, WAKE, CALM)), tr("a2-mic", MIC, MICS, during(micNapKeys, CALM, END)),
      tr("a2-nightcap", MIC, MICS, [...upTo(micNapKeys, WAKE), { t: WAKE + 120, x: px(50), y: px(-40), r: 40, e: "out" }, { t: WAKE + 620, x: px(150), y: px(-30), r: 200, o: 1, e: "lin" }, { t: WAKE + 800, x: px(190), y: px(40), r: 260, o: 0, e: "in" }]),
      zed(380, 0), zed(640, 1), zed(1080, 0), zed(1340, 1),
      ding([MIC[0], MIC[1] - 20], WAKE + 20, 0.56, CREAM),
      sparks([MIC[0], MIC[1] - 30], WAKE + 40, [CREAM, SUN, LILAC], 8, { spread: [-200, 20] }),
    ],
    sounds: [{ name: "pop", at: 40, volume: 0.35 }, { name: "lab-a2-snore-1", at: 380, volume: 0.6 }, { name: "lab-a2-snore-1", at: 1080, volume: 0.6 }, { name: "lab-a2-squeak-1", at: WAKE, volume: 0.75 }, { name: "boop", at: CALM, volume: 0.5 }, { name: "lab-soft-bell-1", at: CALM + 120, volume: 0.4 }],
    pip: [{ at: 0, look: [0, 1], face: "curious" }, { at: 1150, body: "lean", face: "listening" }, { at: WAKE + 60, face: "smile" }, { at: CALM + 60, face: "warm", body: "nod" }, { at: 2750, look: "off" }] },
];

// ═════════════ Home greeting: every app open (short and light) / back after days away ═════════════
// Home's dark top: Pip on his blob (x 95-295, y 90-263); "For you" at y 295, the program card y 330-590. Something on Home
// wakes up because the user came in; it stands beside Pip, never on him.
const LAMP: Pt = [344, 196], LAMPS = 0.26, ON = 400;
const lampKeys: K[] = [{ t: 0, s: 0 }, { t: 220, s: 1, e: "back" }, { t: ON, r: 0, s: 1 }, { t: ON + 50, r: -7, s: 1.06, e: "out" }, { t: ON + 230, r: 0, s: 1, e: "back" }, { t: 1150, s: 1 }, { t: 1230, s: 1.06, e: "out" }, { t: 1420, s: 0, e: "in" }];
const PLANT: Pt = [50, 204], PLANTS = 0.27, PERK = 430;
const plantKeys: K[] = [{ t: 0, s: 0 }, { t: 220, s: 1, e: "back" }, { t: 350, s: 1, y: 0 }, { t: PERK, s: 0.9, y: px(4) }, { t: PERK + 110, s: 1.14, y: px(-9), e: "out" }, { t: PERK + 280, s: 1, y: 0, e: "back" },
  { t: PERK + 360, r: -6 }, { t: PERK + 470, r: 6 }, { t: PERK + 570, r: -3 }, { t: PERK + 650, r: 0 }, { t: 1300, s: 1 }, { t: 1380, s: 1.06, e: "out" }, { t: 1570, s: 0, e: "in" }];
const BIRD: Pt = [338, 299], BIRDS = 0.21, PERCH = 450, TW = [640, 725, 805], TW2 = 1100, OFF = 1550;
const birdKeys: K[] = [...hops(BIRD, [[0, 470, 110, -40], [PERCH, BIRD[0], BIRD[1], 0]], 0).map(k => ({ ...k, r: -18 * (1 - k.t / PERCH), s: 0.8 + 0.2 * (k.t / PERCH) })), { t: PERCH + 50, s: 0.9, y: px(3), r: 0 }, { t: PERCH + 170, s: 1, y: 0, e: "back" },
  { t: TW[0], r: 0, y: 0 }, { t: TW[0] + 40, r: -9, y: px(-5), e: "out" }, { t: TW[1], r: -2, y: 0 }, { t: TW[1] + 40, r: -9, y: px(-5), e: "out" }, { t: TW[2], r: -2, y: 0 }, { t: TW[2] + 40, r: -9, y: px(-5), e: "out" }, { t: 900, r: 0, y: 0 },
  { t: TW2, r: 0, y: 0 }, { t: TW2 + 50, r: -11, y: px(-7), e: "out" }, { t: TW2 + 150, r: 0, y: 0 }, { t: OFF - 100, s: 1, y: 0 }, { t: OFF, s: 0.9, y: px(4) },
  { t: OFF + 110, x: px(14), y: px(-34), r: -16, s: 1, e: "out" }, { t: OFF + 400, x: px(170), y: px(-250), s: 0.7, r: -22, e: "in" }];

const homeGreeting: FxEffect[] = [
  // SYNC: the lamp clicks on with lab-a2-switch-1 (400 ms): the light, the lamp's nod, the sparkles and Pip's small grow are on
  // that click; the marimba note rings just after (440 ms).
  { id: "hg-lamp-on", name: "Lamp clicks on", ms: 1500,
    feel: "A small desk lamp beside Pip is asleep; as you come in it clicks on, wakes with a smile and throws a warm light. Pip sits up, glad you are here. After days away: it flickers twice before it lights, and Pip waves.",
    emitters: [
      ground([LAMP[0] - 12, LAMP[1] + 0.39 * LAMPS * W], LAMPS * 0.6, 40, 1230, SHADE_DARK),
      tr("a2-lamp-off", LAMP, LAMPS, during(lampKeys, 0, ON)), tr("a2-lamp-on", LAMP, LAMPS, during(lampKeys, ON, END)),
      sparks([LAMP[0] - 2, LAMP[1] - 4], ON + 10, [SUN, CREAM, GOLD], 7, { size: [0.018, 0.034], speed: [0.15, 0.4] }),
    ],
    sounds: [{ name: "lab-a2-switch-1", at: ON, volume: 0.8 }, { name: "lab-a2-marimba-note-1", at: ON + 40, volume: 0.4 }],
    pip: [{ at: 0, look: [1, 0.2] }, { at: ON, face: "smile", body: "pop" }, { at: 1150, look: "off" }] },
  // SYNC: the plant springs up on lab-hop-boing-small-1 (430 ms), with Pip's hop; the kalimba note lands as it settles (700 ms).
  { id: "hg-plant-perks", name: "Plant perks up", ms: 1650,
    feel: "A little plant beside Pip is drooping, asleep. You open the app and it springs upright with a boing, leaves high, a happy face, and gives a wiggle; Pip hops with it. After days away: it has grown a flower for you.",
    emitters: [
      ground([PLANT[0], PLANT[1] + 0.41 * PLANTS * W], PLANTS * 0.62, 40, 1380, SHADE_DARK),
      tr("a2-plant-droop", PLANT, PLANTS, during(plantKeys, 0, PERK)), tr("a2-plant-up", PLANT, PLANTS, during(plantKeys, PERK, END)),
      { kind: "burst", shapes: ["leaf"], colors: [GREEN, "#8AF0A5", LIME], origin: at(PLANT[0], PLANT[1] - 30), at: PERK + 60, count: 4, spread: [-140, -40], speed: [0.3, 0.5], drag: 2.2, gravity: 0.5, spin: [80, 200], size: [0.025, 0.04], life: [700, 900], fadeOut: 300 },
      sparks([PLANT[0], PLANT[1] - 40], PERK + 80, [LIME, CREAM, SUN], 5, { size: [0.018, 0.032] }),
    ],
    sounds: [{ name: "lab-hop-boing-small-1", at: PERK, volume: 0.6 }, { name: "lab-kalimba-warm-1", at: PERK + 270, volume: 0.4 }],
    pip: [{ at: 0, look: [-1, 0.3] }, { at: PERK - 70, face: "smile", body: "hop" }, { at: 1300, look: "off" }] },
  // SYNC: the bird lands on "tick" (450 ms); its beak opens on the three chirps of lab-a2-bird-tweet-1 (640, 725, 805 ms), a
  // note with each, and once more on lab-a2-bird-tweet-2 (1100 ms); it takes off on the soft swoosh (1550 ms).
  { id: "hg-bird-hello", name: "Bird says hello", ms: 2000,
    feel: "A small blue bird glides in and lands on the edge of your program card, sings three quick notes at Pip, one more, and flies off. Pip smiles and nods back. After days away: it brings a flower in its beak and Pip waves.",
    emitters: [
      tr("a2-bird", BIRD, BIRDS, during(birdKeys, 0, TW[0])), tr("a2-bird-sing", BIRD, BIRDS, during(birdKeys, TW[0], 900)), tr("a2-bird", BIRD, BIRDS, during(birdKeys, 900, TW2)),
      tr("a2-bird-sing", BIRD, BIRDS, during(birdKeys, TW2, TW2 + 150)), tr("a2-bird", BIRD, BIRDS, during(birdKeys, TW2 + 150, END)),
      ...[TW[0], TW[2], TW2].map((t, i): E => ({ kind: "burst", upright: true, shapes: ["note"], colors: [[PINK, LIME, SUN][i]], origin: at(BIRD[0] - 30, BIRD[1] - 34), at: t, count: 1, spread: [-84 + i * 14, -84 + i * 14], speed: [0.2, 0.24], drag: 1.4, gravity: -0.04, size: [0.05, 0.06], life: [700, 800], fadeIn: 60, fadeOut: 350 })),
    ],
    sounds: [{ name: "lab-swoosh-soft-1", at: 60, volume: 0.3 }, { name: "tick", at: PERCH, volume: 0.35 }, { name: "lab-a2-bird-tweet-1", at: TW[0] - 15, volume: 0.85 }, { name: "lab-a2-bird-tweet-2", at: TW2 - 40, volume: 0.8 }, { name: "lab-swoosh-soft-1", at: OFF, volume: 0.3 }],
    pip: [{ at: 0, look: [1, -0.7], face: "curious" }, { at: PERCH, look: [1, 0.9] }, { at: TW[0] + 40, face: "smile", body: "nod" }, { at: OFF + 100, look: [1, -0.6] }, { at: 1900, look: "off" }] },
];

// ═════════════ Mood check-in: daily; low / neutral / high (the options show neutral; low is always gentle) ═════════════
// Home again. Nothing here cheers at a low mood: for low the same props come slower and softer, with no sparkles and no hops.
const FACE: Pt = [338, 208], FACES = 0.22, ROLL = 150, STOP = 520;
const faceKeys: K[] = [{ t: 0, x: px(ROLL), r: 183 }, { t: STOP, x: 0, r: 0, e: "out" }, { t: STOP + 50, s: 0.94 }, { t: STOP + 200, s: 1, e: "back" }, { t: 800, r: 0, y: 0 }, { t: 900, r: 11, y: px(3) }, { t: 1010, r: 0, y: 0 }, { t: 1100, r: 8, y: px(2) }, { t: 1230, r: 0, y: 0 },
  { t: 1480, x: 0, r: 0 }, { t: 1560, x: px(-8), r: -10, e: "out" }, { t: 1900, x: px(ROLL + 10), r: 195, e: "in" }];
const CLOUD: Pt = [60, 58], CLOUDS = 0.3, PEEK = 800;
const cloudKeys: K[] = [{ t: 0, x: px(-160), y: px(6) }, { t: 700, x: 0, y: 0, e: "out" }, { t: PEEK, s: 1 }, { t: PEEK + 70, s: 1.05 }, { t: PEEK + 240, s: 1, e: "back" }, { t: 1300, y: px(4) }, { t: 1750, y: 0, x: 0, o: 1 }, { t: 2200, x: px(-40), y: px(-46), o: 0, e: "in" }];
const WK: Pt = [195, 338], WKS = 0.84, STICK = 700, DAY_DX = (6 + 12.9 * 4 + 5.25 - 50) / 100 * WKS;
const weekKeys: K[] = [{ t: 0, s: 0, y: px(40) }, { t: 280, s: 1, y: 0, e: "back" }, { t: STICK, s: 1, y: 0 }, { t: STICK + 50, s: 0.95, y: px(5) }, { t: STICK + 220, s: 1, y: 0, e: "back" }, { t: 1650, s: 1 }, { t: 1740, s: 1.04, e: "out" }, { t: 1950, s: 0, y: px(40), e: "in" }];

const moodCheckin: FxEffect[] = [
  // SYNC: the face rolls in on the swoosh and stops on boop (520 ms); it nods twice with Pip on the kalimba note (800 ms).
  { id: "mc-mirror-face", name: "A face like yours", ms: 1950,
    feel: "A round face that matches your answer rolls in beside Pip like a ball and stops; the two look at each other and nod together, then it rolls off. Neutral: a calm lime face. Low: a soft blue face rolls in slowly and just stays close while Pip puts a hand on his cheek, no sound but one low note. High: an orange laughing face bounces in.",
    emitters: [
      groundUnder(faceKeys, FACE, FACE[1] + 0.45 * FACES * W, FACES * 0.8, SHADE_DARK),
      tr("a2-mood-neutral", FACE, FACES, faceKeys),
    ],
    sounds: [{ name: "lab-swoosh-soft-2", at: 0, volume: 0.4 }, { name: "boop", at: STOP, volume: 0.5 }, { name: "lab-kalimba-warm-1", at: 800, volume: 0.5 }],
    pip: [{ at: 0, look: [1, 0.4], face: "curious" }, { at: STOP + 40, face: "warm" }, { at: 800, body: "nod" }, { at: 1560, look: "off" }] },
  // SYNC: the cloud drifts in on the soft swoosh; the sun pops out from behind it on the marimba note (800 ms), with the soft
  // bell under it (820 ms) and Pip's nod.
  { id: "mc-weather", name: "Whatever the weather", ms: 2250,
    feel: "A small cloud with a calm face drifts in over Pip's shoulder and a little sun pops out from behind it: today's weather, noted. Pip looks up and nods. Low: only the cloud comes, slowly, and stays near him; no sun, no chime, Pip breathes out with a warm face. High: the sun comes out big, with rays and a twinkle.",
    emitters: [
      tr("a2-sun", CLOUD, 0.2, [{ t: 0, x: px(-160), y: px(6), s: 0.6, o: 0 }, { t: 700, x: px(6), y: px(2), o: 0, e: "out" }, { t: PEEK - 1, o: 0 }, { t: PEEK, o: 1, e: "hold" }, { t: PEEK + 260, x: px(40), y: px(-24), s: 1, r: 30, e: "back" }, { t: 1750, r: 70, x: px(40), y: px(-24), o: 1, e: "lin" },
        { t: 2200, x: px(0), y: px(-70), r: 90, o: 0, e: "in" }]),
      tr("a2-cloud", CLOUD, CLOUDS, cloudKeys),
      sparks([CLOUD[0] + 44, CLOUD[1] - 26], PEEK + 120, [SUN, CREAM, GOLD], 6, { size: [0.018, 0.032], speed: [0.15, 0.35] }),
    ],
    sounds: [{ name: "lab-swoosh-soft-1", at: 0, volume: 0.35 }, { name: "lab-a2-marimba-note-1", at: PEEK, volume: 0.5 }, { name: "lab-soft-bell-1", at: PEEK + 20, volume: 0.4 }],
    pip: [{ at: 0, look: [-1, -0.8], face: "curious" }, { at: PEEK + 20, face: "warm", body: "nod" }, { at: 1750, look: "off" }] },
  // SYNC: the week card pops up on "pop" (40 ms); the sticker slaps onto today on the pat of lab-grip-pat-2 (700 ms), with Pip's
  // nod and the light haptic; lab-save-confirm-2 rings right after (760 ms).
  { id: "mc-sticker-today", name: "A sticker on today", ms: 2050,
    feel: "This week pops up as seven small squares, a mood dot in each day so far. A round face sticker in today's colour flies down and slaps onto today's square; the card bounces and Pip nods: noted. Low: a soft blue sticker floats down and lands without a sound, no sparkles, and Pip breathes out with a warm face. High: an orange laughing sticker and a hop.",
    emitters: [
      tr("a2-week", WK, WKS, weekKeys),
      tr("a2-mood-neutral", WK, 0.1, [{ t: 0, x: DAY_DX + px(120), y: px(-260), s: 2.6, r: 50, o: 0 }, { t: 380, o: 1, e: "hold" }, { t: STICK, x: DAY_DX, y: 0, s: 1, r: -8, e: "in" }, ...att(after(weekKeys, STICK), DAY_DX, 0, -8)]),
      ding([WK[0] + DAY_DX * W, WK[1] - 2], STICK, 0.24, CREAM),
      sparks([WK[0] + DAY_DX * W, WK[1]], STICK + 10, [LIME, CREAM, GOLD], 8, { size: [0.018, 0.034] }),
    ],
    sounds: [{ name: "pop", at: 40, volume: 0.4 }, { name: "lab-swoosh-soft-1", at: 380, volume: 0.3 }, { name: "lab-grip-pat-2", at: STICK - 60, volume: 0.7 }, { name: "lab-save-confirm-2", at: STICK + 60, volume: 0.5 }],
    pip: [{ at: 0, look: [0.2, 1], face: "curious" }, { at: STICK, face: "smile", body: "nod", haptic: "light" }, { at: 1650, look: "off" }] },
];

export const SAMPLES_B2A: Record<string, FxEffect[]> = {
  "practice-done": practiceDone,
  "practice-ended-early": endedEarly,
  "first-call-done": firstCall,
  "level-up": levelUp,
  "recording-problem": recProblem,
  "home-greeting": homeGreeting,
  "mood-checkin": moodCheckin,
};
