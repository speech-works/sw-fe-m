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
 */
export const lightColors: SemanticColors = {
  background: { canvas: p.paper.canvas, raised: p.paper.panel, sunken: p.paper.sunken },
  surface: {
    default: p.paper.card,
    elevated: p.paper.row,
    row: p.paper.row,
    rowSelected: p.orange[400],
    control: p.paper.control,
    inverse: p.white,
    material: p.paperA(0.85),
  },
  border: {
    hairline: p.blackA(0.08),
    default: p.blackA(0.12),
    strong: p.blackA(0.2),
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
    link: p.orange.textOnLight,
  },
  action: {
    primary: p.orange[400],
    primaryPressed: p.orange[500],
    primaryTint: p.orangeA(0.12),
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
  accentTint: {
    lime: p.lime.tint,
    purple: p.purple.tint,
    success: p.success.tint,
    warning: p.warning.tint,
    danger: p.danger.tint,
    info: p.info.tint,
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
  overlay: { scrim: p.blackA(0.45), pressed: p.orangeA(0.16) },
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
  gamification: { xp: p.lime.base, streak: p.orange[400], stamina: p.info.base, gold: p.warning.base },
  premium: {
    gold: p.premium.gold,
    goldDeep: p.premium.goldDeep,
    goldTint: p.premium.goldTint,
    goldBorder: p.premium.goldBorder,
    orbCyan: p.premium.cyan,
    orbPurple: p.premium.purple,
  },
  shadow: p.black,
};
