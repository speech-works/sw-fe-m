import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

/**
 * Minimal, dependency-free fallback rendered by the root Sentry.ErrorBoundary
 * when a render/JS error escapes the app tree. Intentionally avoids
 * navigation / store / provider dependencies so it still renders even when one
 * of those is the source of the crash (otherwise: white screen).
 */
export const ErrorFallback: React.FC<{ resetError: () => void }> = ({
  resetError,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.body}>
        The app hit an unexpected error. Your progress is safe — please try
        again.
      </Text>
      <TouchableOpacity
        style={styles.button}
        onPress={resetError}
        accessibilityRole="button"
        accessibilityLabel="Try again"
      >
        <Text style={styles.buttonText}>Try again</Text>
      </TouchableOpacity>
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
});
