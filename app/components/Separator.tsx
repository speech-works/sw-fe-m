import { StyleSheet, Text, View } from "react-native";
import React from "react";
import { theme } from "../Theme/tokens";
import { parseTextStyle } from "../util/functions/parseFont";

interface SeparatorProps {
  text?: string;
}

const Separator = ({ text }: SeparatorProps) => {
  const lineStyle = text ? styles.hrWithMargin : styles.hrFull;

  return (
    <View style={styles.flexBox}>
      <View style={lineStyle} />
      {text && <Text style={styles.text}>{text}</Text>}
      <View style={lineStyle} />
    </View>
  );
};

export default Separator;

const styles = StyleSheet.create({
  flexBox: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  hrWithMargin: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.neutral[7],
    marginHorizontal: 10,
  },
  hrFull: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.neutral[7],
  },
  text: {
    color: theme.colors.neutral[5],
    ...parseTextStyle(theme.typography.paragraphBase.regular),
  },
});
