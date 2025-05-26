import { StyleSheet, Text, View } from "react-native";
import React from "react";
import { theme } from "../../../../../../Theme/tokens";
import { parse } from "@babel/core";
import { parseTextStyle } from "../../../../../../util/functions/parseStyles";

interface PageCounterProps {
  currentPage: number;
  totalPages: number;
}

const PageCounter = ({ currentPage, totalPages }: PageCounterProps) => {
  const progress = currentPage / totalPages;

  return (
    <View style={styles.container}>
      <View style={styles.progressBackground}>
        <View style={[styles.progressFill, { flex: progress }]} />
        <View style={{ flex: 1 - progress }} />
      </View>
      <Text style={styles.text}>
        Page {currentPage} of {totalPages}
      </Text>
    </View>
  );
};

export default PageCounter;

const styles = StyleSheet.create({
  container: {
    alignItems: "flex-start",
    flex: 1,
  },
  progressBackground: {
    flexDirection: "row",
    height: 4,
    backgroundColor: theme.colors.background.default,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 4,
  },
  progressFill: {
    backgroundColor: theme.colors.actionPrimary.default,
  },
  text: {
    ...parseTextStyle(theme.typography.BodyDetails),
    color: theme.colors.text.default,
  },
});
