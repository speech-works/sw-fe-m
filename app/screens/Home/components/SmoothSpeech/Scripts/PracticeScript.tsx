import { StyleSheet, Text, View } from "react-native";
import React from "react";
import { parseTextStyle } from "../../../../../util/functions/parseFont";
import { theme } from "../../../../../Theme/tokens";

interface PracticeScriptProps {
  script: string;
}
const PracticeScript = ({ script }: PracticeScriptProps) => {
  return <Text style={styles.textStyle}>{script}</Text>;
};

export default PracticeScript;

const styles = StyleSheet.create({
  textStyle: {
    ...parseTextStyle(theme.typography.paragraphXSmall.regular),
  },
});
