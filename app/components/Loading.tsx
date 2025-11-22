// components/LoadingScreen.tsx
import React from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { theme } from "../Theme/tokens";
import { parseTextStyle } from "../util/functions/parseStyles";

const LoadingScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <ActivityIndicator
        size="large"
        color={theme.colors.actionPrimary.default}
      />

      <Text style={styles.text}>Loading…</Text>
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
});
