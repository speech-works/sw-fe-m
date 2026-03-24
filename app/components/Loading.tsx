// components/LoadingScreen.tsx
import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { theme } from "../Theme/tokens";
import { parseTextStyle } from "../util/functions/parseStyles";

interface LoadingScreenProps {
  message?: string;
  isNested?: boolean;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = "Loading…",
  isNested = false,
}) => {
  return (
    <View style={[styles.container, isNested && styles.nestedContainer]}>
      <ActivityIndicator size="large" color={theme.colors.actionPrimary.default} />

      <Text style={[styles.text, isNested && styles.nestedText]}>{message}</Text>
    </View>
  );
};

export default LoadingScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    backgroundColor: theme.colors.background.default,
    gap: 16,
  },

  text: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
    textAlign: "center",
  },
  nestedContainer: {
    flex: 0,
    backgroundColor: "transparent",
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  nestedText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.title,
    marginTop: 8,
  },
});
