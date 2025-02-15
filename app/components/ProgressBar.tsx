import React from "react";
import { View, StyleSheet } from "react-native";
import { theme } from "../Theme/tokens";

const ProgressBar = ({ percentage = 0 }) => {
  return (
    <View style={styles.container}>
      <View style={[styles.progress, { width: `${percentage}%` }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    height: 8,
    borderRadius: 6,
    backgroundColor: theme.colors.neutral[8],
    overflow: "hidden",
  },
  progress: {
    height: "100%",
    borderRadius: 6,
    backgroundColor: theme.colors.actionPrimary.default,
  },
});

export default ProgressBar;
