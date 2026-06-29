import type { IconName } from "./components/Icon";

/**
 * The icon registry — the single source of truth for "which icon means what".
 *
 * The DS icon set is **Lucide** (the SVG successor of Feather; see `Icon`/`IconName`).
 * Reference these SEMANTIC keys (`icons.win`) instead of hardcoding a glyph name
 * in a screen, so that:
 *   1. a concept always renders the SAME icon everywhere, and
 *   2. no single glyph is overloaded to mean two different things.
 *
 * Rules of the road:
 *   - Need an icon for a concept? Add a key HERE first, then reference it.
 *   - One concept → one key → one glyph. Don't add a second key for the same idea.
 *   - Don't reuse a glyph for an unrelated concept — pick a distinct one.
 *   - `satisfies Record<string, IconName>` keeps every value a real Feather glyph.
 */
export const icons = {
  // ── Shared moments · wins ──
  win: "award", // a win / accomplishment
  courage: "shield", // faced a fear / bravery
  spokeUp: "mic", // spoke up / used your voice
  proud: "star", // proud of a moment

  // ── Shared moments · struggles (escalating: rain → wind → storm; anchor = weight) ──
  toughDay: "cloud-rain", // a hard day
  anxious: "wind", // anxious / unsettled
  struggling: "cloud-lightning", // really struggling (most intense)
  heavy: "anchor", // everything feels heavy / weighed down
} as const satisfies Record<string, IconName>;

export type IconKey = keyof typeof icons;
