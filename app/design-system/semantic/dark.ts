import { palette as p } from "../primitives/palette";
import { SemanticColors } from "./roles";

/** Dark "Vivid" scheme — the primary (and currently only wired) scheme. */
export const darkColors: SemanticColors = {
  background: { canvas: p.ink.canvas, raised: p.ink.panel, sunken: p.ink.sunken },
  surface: {
    default: p.ink.card,
    elevated: p.ink.row,
    row: p.ink.row,
    rowSelected: p.orange[400],
    inset: p.ink.inset,
    skeleton: p.ink.skeleton,
    control: p.ink.control,
    track: p.ink.track,
    inverse: p.white,
    // Light card on ink — the same idea, flipped.
    contrast: p.paper.panel,
    material: "rgba(42,38,31,0.82)",
    // The white disc is already 18.57:1 on the ink canvas; an edge would just be
    // chrome. This role only earns its keep on paper.
    discEdge: "transparent",
  },
  border: {
    hairline: p.whiteA(0.06),
    default: p.whiteA(0.08),
    strong: p.whiteA(0.12),
    selected: p.orange[400],
    focus: p.orange[400],
  },
  text: {
    primary: p.ink.textPrimary,
    secondary: p.ink.textSecondary,
    tertiary: p.ink.textTertiary,
    disabled: p.ink.textDisabled,
    inverse: p.orange.on,
    onInverse: p.ink.canvas,
    onContrast: p.paper.textPrimary,
    onContrastMuted: p.paper.textSecondary,
    link: p.orange[300],
    accent: p.orange[300], // bright orange foreground reads on the dark canvas
  },
  action: {
    primary: p.orange[400],
    primaryPressed: p.orange[500],
    primaryTint: p.orangeA(0.12),
    primaryEdge: "transparent", // the fill is 8.24:1 on the ink canvas already
    onPrimary: p.orange.on,
    secondary: p.ink.row,
    onSecondary: p.white,
    disabledBg: p.ink.card,
    disabledText: p.ink.textDisabled,
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
  accentTint: {
    lime: p.lime.tint,
    purple: p.purple.tint,
    success: p.success.tint,
    warning: p.warning.tint,
    danger: p.danger.tint,
    info: p.info.tint,
  },
  accentText: {
    lime: p.lime.textOnDark,
    purple: p.purple.textOnDark,
    success: p.success.textOnDark,
    warning: p.warning.textOnDark,
    danger: p.danger.textOnDark,
    info: p.info.textOnDark,
  },
  // Bright fills separate from the ink canvas at 5–15:1; an outline would only
  // add noise. The role exists for paper.
  accentEdge: {
    lime: "transparent",
    purple: "transparent",
    success: "transparent",
    warning: "transparent",
    danger: "transparent",
    info: "transparent",
  },
  feedback: {
    success: p.success.base,
    warning: p.warning.base,
    danger: p.danger.base,
    info: p.info.base,
    successText: p.success.textOnDark,
    warningText: p.warning.textOnDark,
    dangerText: p.danger.textOnDark,
    infoText: p.info.textOnDark,
  },
  overlay: { scrim: p.blackA(0.62), pressed: p.orangeA(0.16) },
  input: {
    bg: p.inputBg,
    border: p.inputBorder,
    borderFocus: p.orange[400],
    placeholder: p.ink.textTertiary,
    error: p.danger.base,
  },
  nav: {
    capsule: "rgba(42,38,31,0.74)",
    activePill: p.orange[400],
    onActive: p.orange.on,
    inactive: p.ink.textTertiary,
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
    reading: "transparent",
    breathing: "transparent",
    mirror: "transparent",
    exposure: "transparent",
    fun: "transparent",
    realLife: "transparent",
  },
  // `streak` and `stamina` share the brand orange with `action.primary` on
  // purpose — distinct concepts, same hue today, free to diverge later. Keep
  // `stamina` pointed at what Energy actually renders: it was `info.base`
  // (blue) while every Energy surface drew orange, so the token was lying.
  gamification: { xp: p.lime.base, streak: p.orange[400], stamina: p.orange[400], gold: p.warning.base },
  premium: {
    // Scheme-INVARIANT on purpose: the premium tier is gold-on-slate in both
    // schemes (same reason `UpsellModal` reaches for `elevationDark`).
    slate: p.premium.slate,
    slateMid: p.premium.slateMid,
    gold: p.premium.gold,
    goldDeep: p.premium.goldDeep,
    goldTint: p.premium.goldTint,
    goldBorder: p.premium.goldBorder,
    onGold: p.premium.onGold,
    orbCyan: p.premium.cyan,
    orbPurple: p.premium.purple,
  },
  shadow: p.black,
};
