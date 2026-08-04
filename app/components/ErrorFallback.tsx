import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

/**
 * Minimal, dependency-free fallback rendered by the root Sentry.ErrorBoundary
 * when a render/JS error escapes the app tree. Intentionally avoids
 * navigation / store / provider dependencies so it still renders even when one
 * of those is the source of the crash (otherwise: white screen).
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

  React.useEffect(() => {
    if (!__DEV__ || summary === null) return;
    // Tagged so it is greppable in the Metro output.
    console.error("[ErrorBoundary]", summary, componentStack ?? "");
  }, [summary, componentStack]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.body}>
        Your progress is safe. Please try again.
      </Text>
      <TouchableOpacity
        style={styles.button}
        onPress={resetError}
        accessibilityRole="button"
        accessibilityLabel="Try again"
      >
        <Text style={styles.buttonText}>Try again</Text>
      </TouchableOpacity>

      {__DEV__ && summary !== null ? (
        <ScrollView style={styles.debug} contentContainerStyle={styles.debugContent}>
          <Text style={styles.debugLabel}>DEV ONLY — not shown in release</Text>
          <Text selectable style={styles.debugText}>
            {summary}
          </Text>
          {error instanceof Error && error.stack ? (
            <Text selectable style={styles.debugStack}>
              {error.stack.split("\n").slice(1, 9).join("\n")}
            </Text>
          ) : null}
          {componentStack ? (
            <Text selectable style={styles.debugStack}>
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
    paddingHorizontal: 32,
    backgroundColor: "#FFFFFF",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 10,
    textAlign: "center",
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 28,
  },
  button: {
    backgroundColor: "#F28044",
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 16,
  },
  buttonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  debug: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 24,
    maxHeight: 260,
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  debugContent: { padding: 12, gap: 6 },
  debugLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.6,
    color: "#B91C1C",
  },
  debugText: { fontSize: 12, lineHeight: 17, color: "#7F1D1D" },
  debugStack: { fontSize: 10, lineHeight: 14, color: "#9F1239" },
});
