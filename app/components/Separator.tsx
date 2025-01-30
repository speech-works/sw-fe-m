import { StyleSheet, Text, View } from "react-native";
import React from "react";
import { theme } from "../Theme/tokens";
import { parseTextStyle } from "../util/functions/parseFont";

interface SeparatorProps {
  text?: string;
}

const Separator = ({ text }: SeparatorProps) => {
  return (
    <View style={styles.flexBox}>
      <View style={styles.hr} />
      {text && <Text style={styles.text}>{text}</Text>}
      <View style={styles.hr} />
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
  hr: {
    flex: 1, // Allows the line to take up equal space
    height: 1,
    backgroundColor: theme.colors.neutral[7],
    marginHorizontal: 10,
  },
  text: {
    color: theme.colors.neutral[5],
    ...parseTextStyle(theme.typography.paragraphBase.regular),
  },
});
