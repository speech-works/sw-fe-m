import { StyleSheet, Text, View } from "react-native";
import React from "react";
import Separator from "../../../../../components/Separator";
import { parseTextStyle } from "../../../../../util/functions/parseFont";
import { theme } from "../../../../../Theme/tokens";
import { toSmallCaps } from "../../../../../util/functions/strings";

interface CardContentProps {
  series: string;
  task: string;
  meta: string[];
}

const CardContent = ({ series, task, meta }: CardContentProps) => {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.seriesText}>{toSmallCaps(series)}</Text>
      <Text style={styles.taskText}>{task}</Text>
      <Separator />
      <View style={styles.metaWrapper}>
        {meta.map((t) => (
          <View key={t}>
            <Text style={styles.metaItem}>{t}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

export default CardContent;

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 5,
    alignItems: "center",
    marginVertical: "auto",
    borderRadius: 12,
    width: "100%",
  },
  seriesText: {
    paddingBottom: 10,
    textAlign: "center",
    ...parseTextStyle(theme.typography.paragraphSmall.heavy),
    color: theme.colors.neutral[5],
  },
  taskText: {
    paddingBottom: 32,
    textAlign: "center",
    ...parseTextStyle(theme.typography.f5.heavy_0),
    color: theme.colors.neutral[3],
  },
  metaWrapper: {
    gap: 2,
    paddingVertical: 10,
    width: "100%",
  },
  metaItem: {
    ...parseTextStyle(theme.typography.paragraphSmall.regular),
    color: theme.colors.neutral[3],
  },
});
