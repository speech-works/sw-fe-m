import { palette as p } from "../primitives/palette";
import { SemanticColors } from "./roles";

/**
 * Light "Vivid" scheme — warm paper mirror of the dark scheme. The invariants:
 * bright fills (orange, accents, category hues) keep their dark "on" inks in
 * both schemes, so anything built dark-on-bright flips for free. What swaps is
 * the neutral ground (ink → paper), the border/scrim alphas (white → black),
 * and every "colored text on the ground" variant (feedback.*Text, text.link,
 * input.error → the darker textOnLight cuts; the textOnDark cuts all fail AA
 * on paper). All pairings are verified by utils/schemeAudit in __DEV__.
 *
 * THE THING THIS SCHEME KEEPS GETTING WRONG, stated once. Dark encodes hierarchy
 * in LIGHTNESS, and there is no lightness left here: canvas → pure white is
 * 1.16:1 in total. Porting the ink ladder one-for-one is what made this scheme
 * read flat. Paper's three instruments are RECESS (`surface.inset`), EDGE
 * (`border.*`, `accentEdge`, `action.primaryEdge`, `surface.discEdge`) and
 * SHADOW (`elevationLight`, two-layer). Reach for those, not for a lighter fill.
 */
export const lightColors: SemanticColors = {
  background: { canvas: p.paper.canvas, raised: p.paper.panel, sunken: p.paper.sunken },
  surface: {
    default: p.paper.card,
    elevated: p.paper.row,
    row: p.paper.row,
    rowSelected: p.orange[400],
    // `default` and `elevated` are both near-white here and that is fine —
    // "raised above the canvas" is expressed by the two-layer shadow, not by a
    // fill step there is no room for. `inset` is the one that HAD to move.
    inset: p.paper.inset,
    skeleton: p.paper.skeleton,
    control: p.paper.control,
    track: p.paper.track,
    inverse: p.white,
    // Dark card on paper — 14.19:1 against the canvas.
    contrast: p.ink.panel,
    material: p.paperA(0.85),
    // A white disc on cream is 1.11:1. Same warm ink as `border.strong` so the
    // disc's edge and the app's edges are one material.
    discEdge: p.inkA(0.16),
  },
  border: {
    // Warm-ink alphas (not neutral black) so hairlines share the paper's
    // temperature; same luminance weight as blackA, so contrast is unchanged.
    //
    // DELIBERATELY HEAVIER THAN THE INK SCHEME'S, which is the opposite of the
    // instinct that matched them. On ink a hairline is the SECOND separator,
    // behind a ΔE 7.7 fill step. On paper the fill step is 4.1, so the hairline
    // is most of what draws a card, and matching the two under-draws the one
    // doing the work. These land at ΔE 9.4 / 12.0 / 18.0 on a card.
    hairline: p.inkA(0.12),
    default: p.inkA(0.16),
    strong: p.inkA(0.26),
    // orange[400/500] miss the 3:1 non-text bar on paper; 600 clears it.
    selected: p.orange[600],
    focus: p.orange[600],
  },
  text: {
    primary: p.paper.textPrimary,
    secondary: p.paper.textSecondary,
    tertiary: p.paper.textTertiary,
    disabled: p.paper.textDisabled,
    inverse: p.orange.on,
    onInverse: p.ink.canvas,
    onContrast: p.ink.textPrimary,
    onContrastMuted: p.ink.textSecondary,
    link: p.orange.textOnLight,
    accent: p.orange.textOnLight, // #A84600 amber — AA on paper, keeps warm brand
  },
  action: {
    primary: p.orange[400],
    primaryPressed: p.orange[500],
    primaryTint: p.orangeA(0.12),
    primaryEdge: p.orange.edgeLight, // 3.13:1 on the canvas — the CTA gets a boundary
    onPrimary: p.orange.on,
    secondary: p.paper.control,
    onSecondary: p.paper.textPrimary,
    disabledBg: p.paper.sunken,
    disabledText: p.paper.textDisabled,
  },
  accent: {
    lime: p.lime.base,
    purple: p.purple.base,
    success: p.success.base,
    warning: p.warning.base,
    danger: p.danger.base,
    info: p.info.base,
  },
  accentOn: {
    lime: p.lime.on,
    purple: p.purple.on,
    success: p.success.on,
    warning: p.warning.on,
    danger: p.danger.on,
    info: p.info.on,
  },
  // Per-accent alphas, not the shared 12%: on paper a flat wash keeps a
  // different amount of each hue, so one number splits the family into
  // "visible" and "barely there". See `tintLight` in palette.ts.
  accentTint: {
    lime: p.lime.tintLight,
    purple: p.purple.tintLight,
    success: p.success.tintLight,
    warning: p.warning.tintLight,
    danger: p.danger.tintLight,
    info: p.info.tintLight,
  },
  accentText: {
    lime: p.lime.textOnLight,
    purple: p.purple.textOnLight,
    success: p.success.textOnLight,
    warning: p.warning.textOnLight,
    danger: p.danger.textOnLight,
    info: p.info.textOnLight,
  },
  accentEdge: {
    lime: p.lime.edgeLight,
    purple: p.purple.edgeLight,
    success: p.success.edgeLight,
    warning: p.warning.edgeLight,
    danger: p.danger.edgeLight,
    info: p.info.edgeLight,
  },
  feedback: {
    success: p.success.base,
    warning: p.warning.base,
    danger: p.danger.base,
    info: p.info.base,
    successText: p.success.textOnLight,
    warningText: p.warning.textOnLight,
    dangerText: p.danger.textOnLight,
    infoText: p.info.textOnLight,
  },
  // Warm scrim, not cold black — and LIGHTER than the ink scheme's 0.62. On ink
  // the scrim disappears into the ground and only the sheet reads; on paper a
  // 45% warm-black over cream turned the whole page into a bruise, with an
  // enormous jump to the near-white sheet on top of it. Dimming should read as
  // the lights going down. `pressed` goes the other way for the same reason: a
  // 16% orange wash is ΔE 12 on a dark card but only ΔE 8 on a white one.
  overlay: { scrim: p.inkA(0.32), pressed: p.orangeA(0.2) },
  input: {
    bg: p.inputBgLight,
    border: p.inputBorderLight,
    borderFocus: p.orange[600],
    placeholder: p.paper.textTertiary,
    error: p.danger.textOnLight,
  },
  nav: {
    capsule: p.paperA(0.78),
    activePill: p.orange[400],
    onActive: p.orange.on,
    inactive: p.paper.textTertiary,
    badge: p.danger.base,
  },
  category: {
    reading: p.category.reading.base,
    breathing: p.category.breathing.base,
    mirror: p.category.mirror.base,
    exposure: p.category.exposure.base,
    fun: p.category.fun.base,
    realLife: p.category.realLife.base,
  },
  categoryOn: {
    reading: p.category.reading.on,
    breathing: p.category.breathing.on,
    mirror: p.category.mirror.on,
    exposure: p.category.exposure.on,
    fun: p.category.fun.on,
    realLife: p.category.realLife.on,
  },
  categoryEdge: {
    reading: p.category.reading.edgeLight,
    breathing: p.category.breathing.edgeLight,
    mirror: p.category.mirror.edgeLight,
    exposure: p.category.exposure.edgeLight,
    fun: p.category.fun.edgeLight,
    realLife: p.category.realLife.edgeLight,
  },
  // See the note in dark.ts — `stamina` tracks the hue Energy actually renders
  // (brand orange), not the blue it used to claim. Kept in sync across schemes.
  gamification: { xp: p.lime.base, streak: p.orange[400], stamina: p.orange[400], gold: p.warning.base },
  premium: {
    // Scheme-INVARIANT on purpose: the premium tier is gold-on-obsidian in both
    // schemes (same reason `UpsellModal` reaches for `elevationDark`).
    ground: p.premium.ground,
    groundMid: p.premium.groundMid,
    gold: p.premium.gold,
    goldDeep: p.premium.goldDeep,
    goldTint: p.premium.goldTint,
    goldBorder: p.premium.goldBorder,
    onGold: p.premium.onGold,
    // Ink FOR the ground, and invariant like the ground it sits on. Without this
    // a caller reaches for `text.primary`, which is white on ink and near-black
    // on paper — so a premium surface built once renders correctly in one
    // scheme and as dark-on-obsidian in the other. The ground does not change with
    // the scheme, so neither may its ink.
    onGround: p.white,
    onGroundMuted: p.ink.textSecondary,
    orbCyan: p.premium.cyan,
    orbPurple: p.premium.purple,
  },
  shadow: p.shadowWarm, // warm-brown shadow, not cold #000 — shares the paper's temperature
};
