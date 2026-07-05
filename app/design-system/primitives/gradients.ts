import { palette as p } from "./palette";

/**
 * Gradient tokens — the "Vivid" identity. The app already uses LinearGradient in
 * ~100 places; these centralize the recipes so every gradient is on-brand and
 * swappable. Each token is a `colors` ramp + a direction (start→end, 0..1 unit
 * square). Decorative gradients (sunrise/aurora/meadow) are for hero moments;
 * scrims/fades dissolve content into the canvas; sheen is a glossy top highlight.
 *
 * Brand/decorative/premium ramps are mode-invariant. Canvas-relative ramps
 * (fade, scrimDown/Up, sheen) have light overrides in `schemeGradients` below —
 * the `Gradient` component resolves per scheme, consumers stay token-only.
 */
export type GradientToken = {
  colors: readonly [string, string, ...string[]];
  start: { x: number; y: number };
  end: { x: number; y: number };
  locations?: readonly [number, number, ...number[]];
};

const diagonal = { start: { x: 0, y: 0 }, end: { x: 1, y: 1 } };
const vertical = { start: { x: 0.5, y: 0 }, end: { x: 0.5, y: 1 } };

export const gradients = {
  // Brand — the orange CTA / hero fill.
  brand: { colors: [p.orange[400], p.orange[500]], ...diagonal },
  brandSoft: { colors: [p.orange[300], p.orange[400]], ...diagonal },

  // Decorative energy duos — hero cards, celebration moments.
  sunrise: { colors: [p.orange[400], p.danger.base], ...diagonal },
  aurora: { colors: [p.purple.base, p.info.base], ...diagonal },
  meadow: { colors: [p.lime.base, p.success.base], ...diagonal },

  // Surface fade — softens a section into the canvas.
  fade: { colors: [p.ink.panel, p.ink.canvas], ...vertical },

  // Scrims over imagery (keep text legible). Transparent end uses the matching
  // RGBA so iOS doesn't fade through black.
  scrimDown: { colors: ["rgba(20,19,17,0)", "rgba(10,9,7,0.88)"], ...vertical },
  scrimUp: { colors: ["rgba(10,9,7,0.7)", "rgba(20,19,17,0)"], ...vertical },

  // Glossy top highlight for elevated chrome.
  sheen: { colors: [p.whiteA(0.1), p.whiteA(0)], ...vertical },

  // Premium tier (BuyPro) — slate container + metallic-gold CTA.
  premiumSlate: { colors: [p.premium.slate, p.premium.slateMid, p.premium.slate], ...diagonal },
  premiumGold: { colors: [p.premium.gold, p.premium.goldDeep], ...diagonal },
} as const satisfies Record<string, GradientToken>;

export type GradientName = keyof typeof gradients;

/**
 * Per-scheme overrides for canvas-relative gradients. Only tokens whose ramp
 * references the neutral ground need a light variant; everything else falls
 * through to the base recipe. Transparent ends use the matching paper RGBA so
 * iOS doesn't fade through black.
 */
export const schemeGradients: Record<"dark" | "light", Partial<Record<GradientName, GradientToken>>> = {
  dark: {},
  light: {
    fade: { colors: [p.paper.panel, p.paper.canvas], ...vertical },
    scrimDown: { colors: ["rgba(247,242,234,0)", "rgba(247,242,234,0.92)"], ...vertical },
    scrimUp: { colors: ["rgba(247,242,234,0.8)", "rgba(247,242,234,0)"], ...vertical },
    sheen: { colors: [p.whiteA(0.5), p.whiteA(0)], ...vertical },
  },
};
