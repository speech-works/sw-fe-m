import FA5Icon from "react-native-vector-icons/FontAwesome5";

/**
 * Sanitiser for the server-driven caller glyph.
 *
 * Callers (first call, phone-call exposures) carry an `icon` string chosen in the
 * backend seed and rendered here as FontAwesome 5 **solid**. `react-native-vector-icons`
 * resolves an unknown name to a literal `"?"` (`glyphMap[name] || '?'`) — no warning,
 * no blank — so one wrong string in a seed puts a question mark on somebody's first
 * ever call. It happened: several callers were seeded with Feather names
 * (`mic`, `help-circle`, `message-circle`), which FontAwesome does not have.
 *
 * The seed is still the source of truth; this is the boundary that makes a bad value
 * degrade to a sensible icon instead of a "?", including on environments whose rows
 * predate a fix.
 */

/** FA5's own metadata, via its multi-style validator. Default style is `regular`, so
 *  the style has to be named explicitly or solid-only glyphs (`phone`) read as absent. */
type GlyphValidator = { hasIcon?: (name: string, style?: string) => boolean };

const hasSolidGlyph = (name: string): boolean => {
  const validate = (FA5Icon as unknown as GlyphValidator).hasIcon;
  if (typeof validate !== "function") return true; // never block rendering on a missing API
  try {
    return validate(name, "solid");
  } catch {
    return false;
  }
};

/**
 * Names from other icon vocabularies that have a true FontAwesome equivalent. Mapping
 * beats falling back: the caller keeps the icon that was meant for them even where the
 * data has not been corrected yet.
 */
const EQUIVALENTS: Record<string, string> = {
  // Feather / Material — vocabularies that have leaked into seeds before.
  mic: "microphone",
  "help-circle": "question-circle",
  "message-circle": "comment",
  "message-square": "comment",
  "phone-call": "phone",
};

/**
 * Resolve a server-supplied glyph to one FontAwesome 5 solid can actually draw.
 *
 * @param name     whatever the backend sent (may be undefined/empty)
 * @param fallback the icon to use when nothing resolves — pass the one that suits the
 *                 surface (`user` for a caller avatar, `robot` for the in-call orb)
 */
export function callerGlyph(name?: string | null, fallback = "user"): string {
  const raw = name?.trim();
  if (raw && hasSolidGlyph(raw)) return raw;

  const mapped = raw ? EQUIVALENTS[raw] : undefined;
  if (mapped && hasSolidGlyph(mapped)) {
    if (__DEV__ && raw) {
      console.warn(
        `[callerGlyph] "${raw}" is not a FontAwesome 5 name — drew "${mapped}" instead. ` +
          `Correct it in the backend seed so the data stops carrying it.`,
      );
    }
    return mapped;
  }

  if (__DEV__ && raw) {
    console.warn(
      `[callerGlyph] "${raw}" has no FontAwesome 5 solid glyph and no known equivalent — ` +
        `fell back to "${fallback}". Fix the seed, or add an entry to EQUIVALENTS.`,
    );
  }
  return fallback;
}
