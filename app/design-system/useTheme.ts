import { useMemo } from "react";
import { StyleSheet } from "react-native";
import { useThemeContext } from "./ThemeProvider";
import { tokensByScheme, StaticTokens } from "./theme";
import { SemanticColors } from "./semantic/roles";

/**
 * The single hook screens use. Returns the active color roles + all tokens
 * (scheme-aware where they differ, e.g. elevation shadows). For color-bearing
 * styles, prefer `makeStyles` (memoized per scheme); for inline/dynamic colors,
 * read `colors` directly.
 */
export function useTheme(): { colors: SemanticColors; scheme: string } & StaticTokens {
  const { colors, scheme } = useThemeContext();
  return { colors, scheme, ...tokensByScheme[scheme] };
}

/**
 * Build a styles hook whose color-bearing styles recompute per scheme (cached,
 * so StyleSheet.create runs once per scheme — not per render). Spacing/radius/
 * type can also be read from the second arg; only `elevation` differs by scheme.
 *
 *   const useStyles = makeStyles((c, t) => ({
 *     pill: { backgroundColor: c.surface.row, borderRadius: t.radius.pill },
 *   }));
 *   function Screen() { const styles = useStyles(); ... }
 */
export function makeStyles<T extends StyleSheet.NamedStyles<T>>(
  fn: (colors: SemanticColors, tokens: StaticTokens) => T,
) {
  const cache = new Map<string, T>();
  return function useStyles(): T {
    const { colors, scheme } = useThemeContext();
    return useMemo(() => {
      const cached = cache.get(scheme);
      if (cached) return cached;
      const created = StyleSheet.create(fn(colors, tokensByScheme[scheme]));
      cache.set(scheme, created);
      return created;
    }, [scheme]);
  };
}
