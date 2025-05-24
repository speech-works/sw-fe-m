import { StyleSheet, Text, View } from "react-native";
import React from "react";
import Icon from "react-native-vector-icons/FontAwesome5";
import { theme } from "../../../../../Theme/tokens";
import { parseTextStyle } from "../../../../../util/functions/parseStyles";

const RecordingWidget = () => {
  return (
    <View style={styles.container}>
      <View style={styles.infoBar}>
        <View style={styles.infoBarInner}>
          <Icon
            name="wave-square"
            size={16}
            color={theme.colors.actionPrimary.default}
          />
          <Text style={styles.infoBarLeftText}>Speech</Text>
        </View>
        <View style={styles.infoBarInner}>
          <Text style={styles.infoBarRightText}>Recording</Text>
          <Icon
            solid
            name="circle"
            size={8}
            color={theme.colors.library.green[500]}
          />
        </View>
      </View>
      <View style={styles.wave}></View>
    </View>
  );
};

export default RecordingWidget;

const styles = StyleSheet.create({
  container: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  infoBar: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  infoBarInner: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoBarLeftText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
  },
  infoBarRightText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.library.green[500],
  },
  wave: {
    height: 96,
    backgroundColor: theme.colors.surface.default,
    borderRadius: 12,
  },
});
