import { StyleSheet, Text, View } from "react-native";
import React from "react";
import SettingsGroup from "./SettingsGroup";
import { theme } from "../../../Theme/tokens";

const ApplicationTab = () => {
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
          callback: () => {
            console.log("pressed logout");
          },
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
