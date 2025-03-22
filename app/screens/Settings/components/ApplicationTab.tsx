import { StyleSheet, Text, View } from "react-native";
import React, { useContext } from "react";
import SettingsGroup from "./SettingsGroup";
import { theme } from "../../../Theme/tokens";
import { logoutUser } from "../../../api";
import * as SecureStore from "expo-secure-store";
import { AuthContext } from "../../../contexts/AuthContext";

const ApplicationTab = () => {
  const { logout } = useContext(AuthContext);
  const handleLogout = async () => {
    const accessToken = await SecureStore.getItemAsync("accessToken");
    const refreshToken = await SecureStore.getItemAsync("refreshToken");
    if (refreshToken && accessToken) {
      await logoutUser({ refreshToken, accessToken });
      logout();
    }
  };
  const settings = [
    {
      title: "Security",
      items: [
        {
          title: "Change Password",
          icon: "security",
          callback: () => {
            console.log("pressed change password");
          },
        },
        {
          title: "Logout",
          icon: "power-off",
          color: theme.colors.accent[6],
          callback: handleLogout,
        },
        {
          title: "Help",
          icon: "help-outline",
          callback: () => {
            console.log("pressed help");
          },
        },
      ],
    },
    {
      title: "General Preferences",
      items: [
        {
          title: "Theme",
          icon: "format-paint",
          callback: () => {
            console.log("pressed theme");
          },
        },
        {
          title: "Language",
          icon: "language",
          callback: () => {
            console.log("pressed language");
          },
        },
        {
          title: "Notifications",
          icon: "notifications",
          callback: () => {
            console.log("pressed notifications");
          },
        },
      ],
    },
  ];
  return (
    <View style={styles.panelWrapper}>
      {settings.map((sett) => (
        <SettingsGroup key={sett.title} title={sett.title} items={sett.items} />
      ))}
    </View>
  );
};

export default ApplicationTab;

const styles = StyleSheet.create({
  panelWrapper: {
    width: "100%",
    gap: 5,
  },
});
