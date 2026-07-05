/**
 * Dev-only scheme contrast audit — walks BOTH color schemes over the canonical
 * text-on-surface pairings and warns with a table of any pair below WCAG AA.
 * Single source of truth for hexes stays the scheme objects themselves; this
 * never ships logic to prod (call it under `if (__DEV__)` from App.tsx).
 *
 * Alpha-bearing roles (tints, hairlines, scrims, material) are skipped: their
 * effective color depends on what they composite over, so they're a visual-QA
 * concern, not a flat-ratio one.
 */
import { schemes, Scheme } from "../theme";
import { SemanticColors } from "../semantic/roles";
import { contrastRatio, AA_NORMAL, AA_LARGE } from "./contrast";

type Pairing = {
  label: string;
  fg: (c: SemanticColors) => string;
  bg: (c: SemanticColors) => string;
  /** Large/bold-only text (3:1) instead of normal (4.5:1). */
  large?: boolean;
};

const SURFACES = [
  ["canvas", (c: SemanticColors) => c.background.canvas],
  ["card", (c: SemanticColors) => c.surface.default],
  ["elevated", (c: SemanticColors) => c.surface.elevated],
] as const;

const TEXT_ROLES = [
  ["text.primary", (c: SemanticColors) => c.text.primary],
  ["text.secondary", (c: SemanticColors) => c.text.secondary],
  ["text.tertiary", (c: SemanticColors) => c.text.tertiary],
] as const;

const ACCENTS = ["lime", "purple", "success", "warning", "danger", "info"] as const;
const CATEGORIES = ["reading", "breathing", "mirror", "exposure", "fun", "realLife"] as const;
const FEEDBACK_TEXT = [
  ["feedback.successText", (c: SemanticColors) => c.feedback.successText],
  ["feedback.warningText", (c: SemanticColors) => c.feedback.warningText],
  ["feedback.dangerText", (c: SemanticColors) => c.feedback.dangerText],
  ["feedback.infoText", (c: SemanticColors) => c.feedback.infoText],
] as const;

const buildPairings = (): Pairing[] => {
  const pairings: Pairing[] = [];

  // Text ramp × surfaces. text.secondary must clear control chips too;
  // tertiary is "cards only" by rule (see palette), so control is excluded.
  for (const [tName, tGet] of TEXT_ROLES) {
    for (const [sName, sGet] of SURFACES) {
      pairings.push({ label: `${tName} on ${sName}`, fg: tGet, bg: sGet });
    }
  }
  pairings.push({
    label: "text.secondary on control",
    fg: (c) => c.text.secondary,
    bg: (c) => c.surface.control,
  });

  // Colored text on the ground.
  for (const [fName, fGet] of FEEDBACK_TEXT) {
    pairings.push({ label: `${fName} on canvas`, fg: fGet, bg: (c) => c.background.canvas });
    pairings.push({ label: `${fName} on card`, fg: fGet, bg: (c) => c.surface.default });
  }
  pairings.push({ label: "text.link on canvas", fg: (c) => c.text.link, bg: (c) => c.background.canvas });
  pairings.push({ label: "text.link on card", fg: (c) => c.text.link, bg: (c) => c.surface.default });

  // Dark-on-bright fills.
  pairings.push({ label: "action.onPrimary on action.primary", fg: (c) => c.action.onPrimary, bg: (c) => c.action.primary });
  pairings.push({ label: "action.onSecondary on action.secondary", fg: (c) => c.action.onSecondary, bg: (c) => c.action.secondary });
  for (const a of ACCENTS) {
    pairings.push({ label: `accentOn.${a} on accent.${a}`, fg: (c) => c.accentOn[a], bg: (c) => c.accent[a] });
  }
  for (const cat of CATEGORIES) {
    pairings.push({ label: `categoryOn.${cat} on category.${cat}`, fg: (c) => c.categoryOn[cat], bg: (c) => c.category[cat] });
  }

  // Chrome.
  pairings.push({ label: "nav.onActive on nav.activePill", fg: (c) => c.nav.onActive, bg: (c) => c.nav.activePill });
  pairings.push({ label: "text.onInverse on surface.inverse", fg: (c) => c.text.onInverse, bg: (c) => c.surface.inverse });
  pairings.push({ label: "input.placeholder on input.bg", fg: (c) => c.input.placeholder, bg: (c) => c.input.bg });
  pairings.push({ label: "input.error on input.bg", fg: (c) => c.input.error, bg: (c) => c.input.bg });
  pairings.push({ label: "text.inverse on surface.rowSelected", fg: (c) => c.text.inverse, bg: (c) => c.surface.rowSelected });

  // Non-text UI boundaries (3:1 bar).
  pairings.push({ label: "border.focus vs input.bg (UI 3:1)", fg: (c) => c.input.borderFocus, bg: (c) => c.input.bg, large: true });
  pairings.push({ label: "border.selected vs card (UI 3:1)", fg: (c) => c.border.selected, bg: (c) => c.surface.default, large: true });

  return pairings;
};

/** Run the audit over both schemes; warn a table of failures (dev only). */
export const runSchemeAudit = (): void => {
  if (typeof __DEV__ === "undefined" || !__DEV__) return;
  const pairings = buildPairings();
  const failures: { scheme: Scheme; label: string; ratio: string; need: number }[] = [];

  (Object.keys(schemes) as Scheme[]).forEach((scheme) => {
    const c = schemes[scheme];
    for (const p of pairings) {
      const fg = p.fg(c);
      const bg = p.bg(c);
      if (fg.includes("rgba") || bg.includes("rgba")) continue; // alpha → visual QA
      const need = p.large ? AA_LARGE : AA_NORMAL;
      const ratio = contrastRatio(fg, bg);
      if (ratio < need) {
        failures.push({ scheme, label: p.label, ratio: ratio.toFixed(2), need });
      }
    }
  });

  if (failures.length) {
    // eslint-disable-next-line no-console
    console.warn(`[schemeAudit] ${failures.length} contrast failure(s):`);
    // eslint-disable-next-line no-console
    console.table(failures);
  } else {
    // eslint-disable-next-line no-console
    console.log("[schemeAudit] all scheme pairings clear WCAG AA ✓");
  }
};
