import { IconKey, icons } from "../../design-system";

/**
 * ===========================================================================
 * THE SERVER PICKS THE PROGRAM'S MARK. THIS APP OWNS THE GLYPH.
 * ---------------------------------------------------------------------------
 * `pack.icon` is a key the server stores per program (see the backend's
 * `packIcon.ts`), so a new program, or a rename, does not need a store release
 * to get its own mark.
 *
 * The cost of that split is that the two sides can drift, and the string
 * arriving here is not guaranteed to name anything this build knows about:
 *
 *   an older app meeting a program added after it shipped
 *   an icon renamed in the registry and not in the seed
 *   a pack an admin created in the console and never gave an icon
 *
 * None of those is an error worth showing anybody. They all resolve to the
 * generic mark, so the card looks plainer and nothing else changes.
 *
 * INDEXING `icons` DIRECTLY IS THE BUG THIS EXISTS TO PREVENT. `icons[key]`
 * for an unknown key is `undefined`, which reaches `Icon` as a missing path
 * and renders an empty SVG at 220 points — a hole in the card rather than a
 * fallback.
 * ===========================================================================
 */

/**
 * What a program with no icon, or an icon this build does not have, gets.
 * Deliberately the mark every program used to share, so the worst case is
 * exactly the card we had before any of this.
 */
export const FALLBACK_PACK_ICON: IconKey = "energy";

export function packIconFor(icon: string | null | undefined): IconKey {
  if (!icon) return FALLBACK_PACK_ICON;
  // `hasOwnProperty`, NOT `in`. `in` walks the prototype chain, so "toString",
  // "constructor" and "__proto__" all answer true and would be handed back as
  // icon keys. That is reachable: this string is a free-text column an admin
  // edits in the console.
  return Object.prototype.hasOwnProperty.call(icons, icon)
    ? (icon as IconKey)
    : FALLBACK_PACK_ICON;
}

/**
 * The keys the server sends today, pinned so a rename in the icon registry
 * fails a test here rather than silently flattening every program's card back
 * to the generic mark. It is a COPY of the backend's list, not an import, and
 * the test that reads it says so.
 */
export const SEEDED_PACK_ICONS = [
  "volume",
  "call",
  "roleplay",
  "refresh",
  "heart",
  "warning",
  "growth",
  "tip",
  "voiceTool",
  "listen",
] as const;
