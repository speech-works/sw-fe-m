/**
 * WCAG 2.1 contrast helpers — the single source of truth for "is this text
 * legible on this fill?" across the app.
 *
 * Use these instead of eyeballing colour pairs:
 *  - `onColor(bg, colors)` → the most-legible ink (light vs dark) for any fill.
 *  - `bestForeground(bg, [...])` → pick the highest-contrast option from a set.
 *  - `meetsAA(fg, bg)` / `contrastRatio(fg, bg)` → assert/measure a pair.
 *  - `assertContrast(...)` → dev-only warning when a pair drops below AA.
 *
 * The semantic `accentOn.*` tokens are already AA-verified against their
 * `accent.*` fills, so prefer them for known accent backgrounds. Reach for these
 * helpers when the background is dynamic, computed, or outside the token set.
 */

/** WCAG AA thresholds. Normal text needs 4.5:1; large/bold text 3:1. */
export const AA_NORMAL = 4.5;
export const AA_LARGE = 3;

type RGB = { r: number; g: number; b: number };

const parseColor = (color: string): RGB | null => {
  const c = color.trim();
  // rgb()/rgba()
  const rgbMatch = c.match(/rg+a?\(([^)]+)\)/i);
  if (rgbMatch) {
    const parts = rgbMatch[1].split(",").map((p) => parseFloat(p));
    if (parts.length >= 3 && parts.slice(0, 3).every((n) => !Number.isNaN(n))) {
      return { r: parts[0], g: parts[1], b: parts[2] };
    }
    return null;
  }
  // #rgb / #rrggbb / #rrggbbaa (alpha ignored for luminance)
  let h = c.replace("#", "");
  if (h.length === 3) h = h.split("").map((ch) => ch + ch).join("");
  if (h.length === 8) h = h.slice(0, 6);
  if (h.length !== 6) return null;
  const n = parseInt(h, 16);
  if (Number.isNaN(n)) return null;
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
};

const linearize = (v: number): number => {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
};

/** WCAG relative luminance (0 = black, 1 = white). Unparseable colours → 0. */
export const relativeLuminance = (color: string): number => {
  const rgb = parseColor(color);
  if (!rgb) return 0;
  return 0.2126 * linearize(rgb.r) + 0.7152 * linearize(rgb.g) + 0.0722 * linearize(rgb.b);
};

/** WCAG contrast ratio between two colours (1–21). */
export const contrastRatio = (a: string, b: string): number => {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
};

/** True when `fg` on `bg` clears AA (4.5:1, or 3:1 for large/bold ≥18.66px). */
export const meetsAA = (fg: string, bg: string, large = false): boolean =>
  contrastRatio(fg, bg) >= (large ? AA_LARGE : AA_NORMAL);

/** The highest-contrast option from `candidates` for `bg`. */
export const bestForeground = (bg: string, candidates: readonly string[]): string => {
  let best = candidates[0];
  let bestRatio = -1;
  for (const c of candidates) {
    const r = contrastRatio(c, bg);
    if (r > bestRatio) {
      bestRatio = r;
      best = c;
    }
  }
  return best;
};

/** Pick the legible ink (light vs dark) for any fill, from the theme's ink pair.
 *  Pass `useTheme().colors`. */
export const onColor = (
  bg: string,
  colors: { text: { primary: string; onInverse: string } },
): string => bestForeground(bg, [colors.text.primary, colors.text.onInverse]);

/**
 * Darken an arbitrary hue until it is legible AS foreground on `bg`.
 *
 * A no-op when `fg` already clears `minRatio`, OR when `bg` is not lighter than
 * `fg` — i.e. on the dark canvas, where the ground sits below a bright accent and
 * darkening the foreground could only hurt (so the dark scheme is never touched).
 * On the light "paper" canvas, where a bright accent base collapses to ~1.5–2.9:1
 * as text/icon/stroke, it blends `fg` toward black (hue-preserving) until the pair
 * clears `minRatio` (4.5 for text, `AA_LARGE` for a small icon/thin stroke).
 *
 * Reach for this only when a threaded/computed accent HEX is used as foreground
 * and no accent KEY is in scope to look up the per-scheme `accentText.*` /
 * `text.accent` cut (prefer those roles when a key is available). Keep the bright
 * hex for FILLS. Pass the REAL rendered background — flatten a tint wash with
 * `mix(surface, accent, alpha)` first.
 */
export const darkenForContrast = (
  fg: string,
  bg: string,
  minRatio: number = AA_NORMAL,
): string => {
  if (contrastRatio(fg, bg) >= minRatio) return fg;
  if (relativeLuminance(bg) <= relativeLuminance(fg)) return fg;
  const rgb = parseColor(fg);
  if (!rgb) return fg;
  // Blend toward black in fine steps; on a lighter bg this monotonically raises
  // contrast, so the first step that clears is the lightest legible cut.
  for (let t = 0.02; t <= 1.0001; t += 0.02) {
    const cut =
      "#" +
      [rgb.r, rgb.g, rgb.b]
        .map((v) => Math.round(v * (1 - t)).toString(16).padStart(2, "0"))
        .join("");
    if (contrastRatio(cut, bg) >= minRatio) return cut;
  }
  return "#000000";
};

/** Dev-only guard: warns (never throws) when a pair is below AA. No-op in prod. */
export const assertContrast = (
  fg: string,
  bg: string,
  label: string,
  large = false,
): void => {
  if (typeof __DEV__ !== "undefined" && __DEV__ && !meetsAA(fg, bg, large)) {
    const ratio = contrastRatio(fg, bg).toFixed(2);
    const need = large ? AA_LARGE : AA_NORMAL;
    // eslint-disable-next-line no-console
    console.warn(
      `[contrast] "${label}": ${fg} on ${bg} is ${ratio}:1 — below AA (${need}:1). ` +
        `Use onColor(bg, colors) or an accentOn.* token.`,
    );
  }
};
