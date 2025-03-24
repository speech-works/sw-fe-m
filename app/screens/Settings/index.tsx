import { StyleSheet, Text, View, Image, Pressable } from "react-native";
import React from "react";
import { theme } from "../../Theme/tokens";
import Icon from "react-native-vector-icons/MaterialIcons";
import { parseTextStyle } from "../../util/functions/parseFont";
import ApplicationTab from "./components/ApplicationTab";
import TopTabs from "../../components/TopTabs";
import ProfileTab from "./components/ProfileTab";
import { useUserStore } from "../../stores/user";
import * as ImagePicker from "expo-image-picker";
import { updateUserById } from "../../api";

const Settings = () => {
  const user = useUserStore((state) => state.user);
  const updateProfilePicture = useUserStore(
    (state) => state.updateProfilePicture
  );

  const handleProfilePictureChange = async () => {
    if (!user) return;
    // Request permission to access the media library
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== "granted") {
      alert("Sorry, we need camera roll permissions to make this work!");
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true, // Allow cropping
        aspect: [1, 1], // Crop to a square
        quality: 0.8,
      });

      if (!result.canceled) {
        const newProfilePic = result.assets[0].uri;
        // ✅ Upload the image to the server (gcp, s3, etc)

        // ✅ Get the new URL from the server

        // ✅ Use the API to update the user's profile picture url
        const updatedUser = await updateUserById(user.id, {
          profilePictureUrl: newProfilePic,
        });
        console.log("Updated user after profile pic update:", updatedUser);
        // ✅ Then update the store
        updateProfilePicture(newProfilePic);
      }
    } catch (error) {
      console.log("Error selecting image:", error);
    }
  };

  return (
    <View style={styles.wrapper}>
      <Text style={styles.titleText}>Settings</Text>
      <View style={styles.profileWrapper}>
        <View style={styles.avatarWrapper}>
          <Pressable onTouchEnd={handleProfilePictureChange}>
            <Image
              source={
                user?.profilePictureUrl
                  ? { uri: user.profilePictureUrl }
                  : require("../../assets/profilePic.png")
              }
              resizeMode="contain"
              style={styles.avatarImg}
            />
          </Pressable>
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
