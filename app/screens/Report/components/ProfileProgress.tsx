import { StyleSheet, Text, View } from "react-native";
import React from "react";
import { theme } from "../../../Theme/tokens";
import { parseTextStyle } from "../../../util/functions/parseFont";
import ProgressBar from "../../../components/ProgressBar";

const ProfileProgress = () => {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.mainText}>Your Profile Progress</Text>
      <Text style={styles.subText}>Complete your profile</Text>
      <View style={styles.progressBarWrapper}>
        <ProgressBar percentage={42} />
        <Text style={styles.progressNumber}>42%</Text>
      </View>
    </View>
  );
};

export default ProfileProgress;

const styles = StyleSheet.create({
  wrapper: {
    padding: 16,
    borderWidth: 1,
    borderRadius: 8,
    borderColor: theme.colors.neutral[7],
    gap: 2,
  },
  mainText: {
    ...parseTextStyle(theme.typography.f6.heavy_0),
    color: theme.colors.neutral.black,
  },
  subText: {
    ...parseTextStyle(theme.typography.paragraphSmall.heavy),
    color: theme.colors.neutral[3],
  },
  progressBarWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginTop: 6,
  },
  progressNumber: {
    ...parseTextStyle(theme.typography.f6.heavy_1200),
    color: theme.colors.neutral[3],
  },
});
