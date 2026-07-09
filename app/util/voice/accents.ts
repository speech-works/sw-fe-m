import type { SupportedAccentLocale } from "./types";

/**
 * Curated accent catalogue, in display order. The cross-platform reliable set
 * (Indian, American, British, Australian) comes first; Irish and South African
 * are iOS-mostly bonuses and are listed last.
 *
 * `matchPrefixes` lets us map engine voices whose language tag is broader or
 * regionally tagged (e.g. some Android engines report "en_IN" or "en-IN-...")
 * onto the curated locale.
 */
export interface AccentMeta {
  locale: SupportedAccentLocale;
  label: string;
  flag: string;
}

export const SUPPORTED_ACCENTS: readonly AccentMeta[] = [
  { locale: "en-IN", label: "Indian", flag: "🇮🇳" },
  { locale: "en-US", label: "American", flag: "🇺🇸" },
  { locale: "en-GB", label: "British", flag: "🇬🇧" },
  { locale: "en-AU", label: "Australian", flag: "🇦🇺" },
  { locale: "en-IE", label: "Irish", flag: "🇮🇪" },
  { locale: "en-ZA", label: "South African", flag: "🇿🇦" },
] as const;

export const ACCENT_META_BY_LOCALE: Record<SupportedAccentLocale, AccentMeta> =
  SUPPORTED_ACCENTS.reduce(
    (acc, meta) => {
      acc[meta.locale] = meta;
      return acc;
    },
    {} as Record<SupportedAccentLocale, AccentMeta>,
  );

/**
 * Normalise an engine language tag to one of our curated locales, or null.
 * Handles separators ("en_IN" vs "en-IN") and extra regional/script subtags
 * ("en-IN-x-...") by comparing the language + region only.
 */
export function toSupportedAccent(
  language: string | undefined,
): SupportedAccentLocale | null {
  if (!language) return null;
  const parts = language.replace(/_/g, "-").toLowerCase().split("-");
  if (parts[0] !== "en" || !parts[1]) return null;
  const candidate = `en-${parts[1].toUpperCase()}` as SupportedAccentLocale;
  return ACCENT_META_BY_LOCALE[candidate] ? candidate : null;
}
