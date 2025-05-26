import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import React from "react";
import Icon from "react-native-vector-icons/FontAwesome5";
import { theme } from "../../../../../Theme/tokens";
import { parseShadowStyle } from "../../../../../util/functions/parseStyles";

const RecorderWidget = () => {
  return (
    <View style={styles.micContainer}>
      <TouchableOpacity style={[styles.circle]} onPress={() => {}}>
        <Icon name="random" size={16} color={theme.colors.text.default} />
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.circle, styles.micCircle]}
        onPress={() => {}}
      >
        <Icon name="microphone" size={24} color={theme.colors.text.onDark} />
      </TouchableOpacity>
      <TouchableOpacity style={[styles.circle]} onPress={() => {}}>
        <Icon name="play" size={16} color={theme.colors.text.default} />
      </TouchableOpacity>
    </View>
  );
};

export default RecorderWidget;

const styles = StyleSheet.create({
  micContainer: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "flex-start",
    gap: 16,
    paddingHorizontal: 24,
  },
  circle: {
    justifyContent: "center",
    alignItems: "center",
    height: 64,
    width: 64,
    borderRadius: "50%",
    backgroundColor: theme.colors.library.gray[100],
  },
  micCircle: {
    height: 80,
    width: 80,
    backgroundColor: theme.colors.library.orange[400],
    ...parseShadowStyle(theme.shadow.elevation2),
  },
});
