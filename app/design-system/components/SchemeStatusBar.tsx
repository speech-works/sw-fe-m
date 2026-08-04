import React from "react";
import { Platform, StatusBar, StatusBarProps } from "react-native";
import { SystemBars } from "react-native-edge-to-edge";
import { useTheme } from "../useTheme";

/**
 * StatusBar whose glyph style follows the active scheme (light glyphs on the
 * dark canvas, dark glyphs on paper). For custom-layout screens that render
 * their own status bar — screens built on `Page` get this for free and must
 * NOT render a second one. Screens that are dark BY DESIGN (camera, imagery
 * heroes) keep a literal `barStyle="light-content"` instead.
 */
export const SchemeStatusBar: React.FC<Omit<StatusBarProps, "barStyle">> = (props) => {
  const { scheme } = useTheme();
  return (
    <StatusBar
      barStyle={scheme === "dark" ? "light-content" : "dark-content"}
      {...props}
    />
  );
};

/**
 * Keeps the NAVIGATION bar's icons legible against the app canvas, app-wide.
 * Mount exactly once, inside `ThemeProvider` (see App.tsx) — it is a window-level
 * setting, not a per-screen one.
 *
 * Necessary because under edge-to-edge the system draws the nav bar transparent
 * over our own canvas, and `Theme.EdgeToEdge` otherwise picks icon colour from
 * the OS night mode via `-night` resource qualifiers. This app's scheme is a
 * user preference (Light/Dark/System), so a user on system-dark with the app set
 * to Light would get light icons on a light strip. Driving it from `scheme` is
 * what makes the two agree.
 *
 * Requires `enforceNavigationBarContrast: false` in the react-native-edge-to-edge
 * plugin config — while the framework contrast scrim is enforced, the native
 * `setNavigationBarStyle` is a no-op and this component silently does nothing.
 *
 * ANDROID ONLY, twice over, and both are deliberate:
 *
 *  1. The gate below. `SystemBars` is not Android-only internally — on iOS its
 *     `setStatusBarStyle` calls `StatusBar.setBarStyle()` IMPERATIVELY. This app
 *     drives the iOS status bar declaratively from ~33 `<StatusBar>` elements
 *     (including screens that are dark by design — camera, video, ReadingStage),
 *     and an imperative setter fights that prop stack non-deterministically.
 *  2. The `navigationBar`-only style. Even on Android, this must not touch the
 *     status bar, which `Page`/`SchemeStatusBar` already own. Passing the compact
 *     `style="light"` form would set BOTH bars.
 *
 * Together they guarantee this component can only ever change the Android
 * navigation bar — the one thing edge-to-edge actually handed us.
 */
export const SchemeSystemBars: React.FC = () => {
  const { scheme } = useTheme();
  if (Platform.OS !== "android") return null;
  return <SystemBars style={{ navigationBar: scheme === "dark" ? "light" : "dark" }} />;
};
