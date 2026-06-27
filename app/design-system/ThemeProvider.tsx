import React, { createContext, useContext, useMemo } from "react";
import { Scheme, schemes } from "./theme";
import { SemanticColors } from "./semantic/roles";

type ThemeContextValue = { scheme: Scheme; colors: SemanticColors };

const ThemeContext = createContext<ThemeContextValue>({
  scheme: "dark",
  colors: schemes.dark,
});

/**
 * Provides the active color scheme to the new design system. Defaults to dark
 * (the only shipped scheme today). Phase F wires `scheme` to useColorScheme() /
 * a ui-store toggle — at which point screens flip with zero edits because they
 * consume roles, not raw colors.
 */
export const ThemeProvider: React.FC<{ scheme?: Scheme; children: React.ReactNode }> = ({
  scheme = "dark",
  children,
}) => {
  const value = useMemo(() => ({ scheme, colors: schemes[scheme] }), [scheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useThemeContext = () => useContext(ThemeContext);
