import { StyleSheet, Text, View, Image } from "react-native";
import React, { useEffect } from "react";
import { theme } from "../../Theme/tokens";
import Icon from "react-native-vector-icons/MaterialIcons";
import { parseTextStyle } from "../../util/functions/parseFont";
import ApplicationTab from "./components/ApplicationTab";
import TopTabs from "../../components/TopTabs";
import ProfileTab from "./components/ProfileTab";
import { useUserStore } from "../../stores/user";

const Settings = () => {
  const user = useUserStore((state) => state.user);
  useEffect(() => {
    console.log("Settings screen mounted");
  }, []);
  return (
    <View style={styles.wrapper}>
      <Text style={styles.titleText}>Settings</Text>
      <View style={styles.profileWrapper}>
        <View style={styles.avatarWrapper}>
          <Image
            source={require("../../assets/profilePic.png")}
            resizeMode="contain"
            style={styles.avatarImg}
          />
          <View style={styles.proTag}>
            <Icon name="offline-bolt" size={12} color="#F2C94C" />
            <Text style={styles.proText}>PRO</Text>
          </View>
        </View>
        <View style={styles.profileTextWrapper}>
          <Text style={styles.nameText}>{user?.name}</Text>
          <Text style={styles.subText}>
            member since{" "}
            {user && user.createdAt
              ? new Date(user.createdAt).getFullYear()
              : ""}
          </Text>
        </View>
      </View>
      <View>
        <TopTabs
          tabs={[
            { tabName: "Profile", tabContent: <ProfileTab /> },
            { tabName: "Application", tabContent: <ApplicationTab /> },
          ]}
        />
      </View>
    </View>
  );
};

export default Settings;

const styles = StyleSheet.create({
  wrapper: {
    padding: 24,
    gap: 20,
  },
  profileWrapper: {
    gap: 12,
    alignItems: "center",
  },
  avatarImg: {
    height: 72,
    width: 72,
    borderRadius: 36,
    borderColor: theme.colors.actionPrimary.default,
    borderWidth: 1,
  },
  nameText: {
    textAlign: "center",
    ...parseTextStyle(theme.typography.f6.heavy_1200),
  },
  subText: {
    textAlign: "center",
    ...parseTextStyle(theme.typography.paragraphSmall.heavy),
    color: theme.colors.neutral[3],
  },
  titleText: {
    alignSelf: "center",
    ...parseTextStyle(theme.typography.paragraphSmall.heavy),
  },
  avatarWrapper: {
    position: "relative",
    alignItems: "center",
  },
  proTag: {
    padding: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 1.5,
    boxShadow: "0px 1.25px 4px rgba(0, 0, 0, 0.25)",
    borderRadius: 5,
    position: "absolute",
    bottom: -4,
    backgroundColor: theme.colors.neutral.white,
  },
  proText: {
    ...parseTextStyle(theme.typography.paragraphTiny.heavy),
  },
  profileTextWrapper: {
    gap: 4,
  },
});
