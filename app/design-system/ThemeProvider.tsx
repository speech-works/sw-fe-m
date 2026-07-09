import React, { createContext, useContext, useMemo } from "react";
import { useColorScheme } from "react-native";
import { Scheme, schemes } from "./theme";
import { SemanticColors } from "./semantic/roles";
import { useAppearanceStore } from "../stores/appearance";

type ThemeContextValue = { scheme: Scheme; colors: SemanticColors };

const ThemeContext = createContext<ThemeContextValue>({
  scheme: "dark",
  colors: schemes.dark,
});

/**
 * Provides the active color scheme to the design system. With no `scheme` prop
 * it self-resolves from the user's appearance preference (Settings →
 * Appearance): "light"/"dark" pin the scheme; "system" follows the device via
 * useColorScheme() (live — flips while the app is foregrounded). An explicit
 * `scheme` prop OVERRIDES the preference for the subtree — that's how
 * always-dark surfaces (camera screens) and the DevPreview lock themselves.
 * Screens flip with zero edits because they consume roles, not raw colors.
 */
export const ThemeProvider: React.FC<{ scheme?: Scheme; children: React.ReactNode }> = ({
  scheme,
  children,
}) => {
  const mode = useAppearanceStore((s) => s.mode);
  const system = useColorScheme(); // subscribes to OS appearance changes
  const resolved: Scheme =
    scheme ?? (mode === "system" ? (system === "light" ? "light" : "dark") : mode);
  const value = useMemo(() => ({ scheme: resolved, colors: schemes[resolved] }), [resolved]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

/**
 * Locks a subtree to the dark scheme regardless of the user's appearance
 * preference. For surfaces that are dark BY DESIGN (live-camera chrome,
 * fullscreen video) — not a migration escape hatch.
 */
export const ForceDark: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider scheme="dark">{children}</ThemeProvider>
);

export const useThemeContext = () => useContext(ThemeContext);
