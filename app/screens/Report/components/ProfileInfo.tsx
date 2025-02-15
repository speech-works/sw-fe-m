import { StyleSheet, Text, View, Image } from "react-native";
import React from "react";
import { parseTextStyle } from "../../../util/functions/parseFont";
import { theme } from "../../../Theme/tokens";

const ProfileInfo = () => {
  return (
    <View style={styles.wrapper}>
      <Image
        source={require("../../../assets/profilePic.png")}
        resizeMode="contain"
        style={styles.profileImage}
      />
      <View style={styles.profileDetails}>
        <Text style={styles.nameText}>Mayank Sinha</Text>
        <Text style={styles.subText}>member since 2025</Text>
        <View style={styles.tags}>
          <Text style={[styles.tag, styles.orangeTag]}>Starter</Text>
          <Text style={[styles.tag, styles.greenTag]}>Hustler</Text>
        </View>
      </View>
    </View>
  );
};

export default ProfileInfo;

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
  },
  nameText: {
    ...parseTextStyle(theme.typography.f6.heavy_0),
    color: theme.colors.neutral.black,
  },
  subText: {
    ...parseTextStyle(theme.typography.paragraphSmall.heavy),
    color: theme.colors.neutral[3],
  },
  tags: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  tag: {
    ...parseTextStyle(theme.typography.paragraphXSmall.heavy),
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  greenTag: {
    backgroundColor: theme.colors.secondary[100],
  },
  orangeTag: {
    backgroundColor: theme.colors.actionPrimary.default,
    color: theme.colors.neutral.white,
  },
  profileImage: {
    height: 100,
    width: 100,
    borderRadius: 50,
    borderColor: theme.colors.actionPrimary.default,
    borderWidth: 1,
  },
  profileDetails: {
    gap: 4,
  },
});
