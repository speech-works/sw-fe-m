import React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Safe-area probe — the instrument for "the bottom of the screen is wrong on
 * some Android phones".
 *
 * ── OFF BY DEFAULT. Flip `ENABLED` to true, run a dev build, read the strip,
 *    flip it back. Never commit it as true. ──
 *
 * WHY THIS EXISTS RATHER THAN A FIX (reported 2026-08-16 on a Samsung A70).
 * The floating dock sat on top of the navigation buttons, list rows hid behind
 * the dock, and a card bled under the three-button bar. Every one of those is
 * what you would see if `insets.bottom` reported 0 — but nothing in the source
 * says whether it does, and the phones where it looks correct cannot tell you
 * either. Reading more code cannot settle it. Measure first.
 *
 * The layout code is already correct ON PAPER, which is exactly why guessing is
 * dangerous. All of it depends on the one number below:
 *
 *   - `useNavBarInset()` returns `insets.bottom` on Android, 0 on iOS.
 *   - `TabDock` sits at `bottom: 30 + navBarInset`.
 *   - `Page` with `tabBarSafe` reserves `size.tabBarSafe + navBarInset`.
 *
 * If `insets.bottom` is 0 on this device, all three collapse to the old
 * pre-edge-to-edge geometry at once, and every symptom follows from that single
 * cause.
 *
 * HOW TO READ IT. Open any tab-root screen (Home, Explore, Buddy, Settings) on
 * the affected phone:
 *
 *   bottom=0    The phone is not reporting its navigation bar. The fix belongs
 *               in `useNavBarInset` — floor the Android value when the bar is
 *               present. Do NOT patch the individual screens; there are dozens
 *               and they are all already correct.
 *
 *   bottom=48   Three-button bar, reported properly. The maths is right and the
 *               fault is on specific screens escaping the `Page` / `TabDock`
 *               scaffold. Find those screens; leave the helper alone.
 *
 *   bottom=24   Gesture bar, reported properly. Same conclusion as 48.
 *
 * Compare against a phone where the layout looks correct. The difference
 * between the two readings is the bug.
 *
 * Related: `edgeToEdgeEnabled: true` and `enforceNavigationBarContrast: false`
 * in app.config.js. The second one removes the grey scrim Android would
 * otherwise paint behind its buttons, which is deliberate — the scrim overrides
 * the in-app Light/Dark preference for the button glyphs — but it does mean
 * content sits directly behind the buttons with nothing between them. That
 * makes a wrong inset far more obvious on a thick three-button bar than on a
 * thin gesture bar.
 */
const ENABLED = false;

export const InsetProbe: React.FC = () => {
  const insets = useSafeAreaInsets();

  if (!ENABLED) return null;

  const navBarInset = Platform.OS === "android" ? insets.bottom : 0;

  return (
    <View pointerEvents="none" style={styles.strip}>
      <Text style={styles.line}>
        {Platform.OS} {String(Platform.Version)} · top={Math.round(insets.top)}{" "}
        bottom={Math.round(insets.bottom)} · navBarInset={Math.round(navBarInset)}
      </Text>
      <Text style={styles.line}>
        dock sits at {30 + navBarInset} from screen edge
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  strip: {
    position: "absolute",
    left: 0,
    right: 0,
    // Deliberately pinned to the true bottom of the WINDOW, ignoring every
    // inset. The point is to sit in the disputed zone and show what is there.
    bottom: 0,
    backgroundColor: "rgba(255,0,0,0.85)",
    paddingVertical: 4,
    paddingHorizontal: 8,
    zIndex: 99999,
  },
  line: {
    color: "#FFFFFF",
    fontSize: 11,
    fontVariant: ["tabular-nums"],
  },
});
