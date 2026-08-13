import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";

import { darkColors } from "../design-system/semantic/dark";
import { lightColors } from "../design-system/semantic/light";
import { typography } from "../design-system/primitives/typography";
import { radius, spacing, space, borderWidth } from "../design-system/primitives/scale";

/**
 * Minimal, dependency-free fallback rendered by the root Sentry.ErrorBoundary
 * when a render/JS error escapes the app tree. Intentionally avoids
 * navigation / store / provider dependencies so it still renders even when one
 * of those is the source of the crash (otherwise: white screen).
 *
 * ── WHY THIS ONE SCREEN IMPORTS SCHEMES INSTEAD OF CALLING `useTheme()` ──────
 * The boundary is mounted OUTSIDE `ThemeProvider` (see App.tsx) precisely so a
 * crash inside the provider still renders something. That rules out `useTheme`,
 * the DS `Text`, and the DS `Button` — every one of them reads the context this
 * screen may be standing in the ruins of.
 *
 * It does NOT rule out the tokens themselves: `darkColors` / `lightColors` /
 * `typography` / `scale` are plain objects with no React in them, so importing
 * them directly is provider-free and still leaves exactly one definition of the
 * warm palette and the type scale. This screen previously hardcoded a pure-white
 * canvas, cold Tailwind greys, and `#F28044` — a brand orange that is in no
 * palette (the hero is `#FF9040`) — under white label text at 2.64:1, which
 * fails AA. On a dark-mode device it flashed white at the worst possible moment.
 *
 * The scheme comes from the OS (`useColorScheme`) rather than the in-app
 * Light/Dark preference, which lives in a store this screen must not depend on.
 * Someone who forced Light against a dark OS gets a dark crash screen: the wrong
 * one of two correct-looking screens, which is a far better failure than a
 * provider-dependent fallback that renders nothing at all.
 */

/**
 * WHAT ACTUALLY BROKE — on screen, in dev builds only.
 *
 * This screen used to receive the error and drop it, which made every report of
 * it unactionable: "sometimes I see Something went wrong" is a symptom with a
 * hundred causes, the boundary is at the ROOT so the error can come from
 * anywhere in the tree, and "Try again" remounts everything and lands the user
 * on Home — destroying the state that would have identified it. Reproducing it
 * then told you nothing you didn't already know.
 *
 * Dev-only by construction: `__DEV__` is compile-time, so the release bundle
 * keeps exactly the four elements it has today and never shows a user a stack
 * trace. Also mirrored to `console.error` so it reaches the Metro terminal even
 * if the user navigates off the screen before reading it.
 */
function describe(error: unknown): string {
  if (error instanceof Error) {
    return [error.name, error.message].filter(Boolean).join(": ");
  }
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

export const ErrorFallback: React.FC<{
  resetError: () => void;
  /** Passed through by Sentry.ErrorBoundary. Typed loosely — it is `unknown` to
   *  the boundary and this component must never throw while reporting a throw. */
  error?: unknown;
  componentStack?: string | null;
}> = ({ resetError, error, componentStack }) => {
  const summary = error === undefined ? null : describe(error);
  const c = useColorScheme() === "light" ? lightColors : darkColors;

  React.useEffect(() => {
    if (!__DEV__ || summary === null) return;
    // Tagged so it is greppable in the Metro output.
    console.error("[ErrorBoundary]", summary, componentStack ?? "");
  }, [summary, componentStack]);

  return (
    <View style={[styles.container, { backgroundColor: c.background.canvas }]}>
      <Text style={[styles.title, { color: c.text.primary }]}>
        Something went wrong
      </Text>
      <Text style={[styles.body, { color: c.text.secondary }]}>
        Your progress is safe. Please try again.
      </Text>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: c.action.primary }]}
        onPress={resetError}
        accessibilityRole="button"
        accessibilityLabel="Try again"
      >
        {/* Dark ink on the orange fill — the app's AA pairing (7.71:1). White
            on orange, which this used to be, is 2.64:1. */}
        <Text style={[styles.buttonText, { color: c.action.onPrimary }]}>
          Try again
        </Text>
      </TouchableOpacity>

      {__DEV__ && summary !== null ? (
        <ScrollView
          style={[
            styles.debug,
            {
              backgroundColor: c.surface.default,
              borderColor: c.feedback.dangerText,
            },
          ]}
          contentContainerStyle={styles.debugContent}
        >
          <Text style={[styles.debugLabel, { color: c.feedback.dangerText }]}>
            DEV ONLY — not shown in release
          </Text>
          <Text selectable style={[styles.debugText, { color: c.text.primary }]}>
            {summary}
          </Text>
          {error instanceof Error && error.stack ? (
            <Text selectable style={[styles.debugStack, { color: c.text.secondary }]}>
              {error.stack.split("\n").slice(1, 9).join("\n")}
            </Text>
          ) : null}
          {componentStack ? (
            <Text selectable style={[styles.debugStack, { color: c.text.secondary }]}>
              {componentStack.split("\n").slice(0, 9).join("\n")}
            </Text>
          ) : null}
        </ScrollView>
      ) : null}
    </View>
  );
};

export default ErrorFallback;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing["3xl"],
  },
  title: {
    ...typography.h2,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  body: {
    ...typography.body,
    textAlign: "center",
    marginBottom: space.titleGap,
  },
  button: {
    paddingHorizontal: space.sectionGap,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
  },
  buttonText: typography.title,
  debug: {
    position: "absolute",
    left: space.screenX,
    right: space.screenX,
    bottom: space.sectionGap,
    maxHeight: 260,
    borderRadius: radius.input,
    borderWidth: borderWidth.thin,
  },
  debugContent: { padding: spacing.md, gap: spacing.xs },
  debugLabel: typography.eyebrow,
  debugText: typography.bodySm,
  debugStack: typography.caption,
});
