import { StyleSheet, View } from "react-native";
import React from "react";
import SettingsGroup from "./SettingsGroup";

const ProfileTab = () => {
  const settings = [
    {
      title: "Basic Information",
      items: [
        {
          title: "Mayankmacav@gmail.com",
          icon: "mail-outline",
          callback: () => {
            console.log("pressed change password");
          },
        },
        {
          title: "phone",
          icon: "smartphone",
          callback: () => {
            console.log("pressed logout");
          },
        },
        {
          title: "Help",
          icon: "mood",
          callback: () => {
            console.log("pressed help");
          },
        },
      ],
    },
    {
      title: "Details",
      items: [
        {
          title: "Lives in Abu Dhabi, United Arab Emirates",
          icon: "my-location",
          callback: () => {
            console.log("pressed theme");
          },
        },
        {
          title: "Joined April 2025",
          icon: "schedule",
          callback: () => {
            console.log("pressed language");
          },
        },
        {
          title: "History",
          icon: "history",
          callback: () => {
            console.log("pressed notifications");
          },
        },
      ],
    },
    {
      title: "Payment",
      items: [
        {
          title: "PRO",
          icon: "offline-bolt",
          callback: () => {
            console.log("pressed theme");
          },
        },
        {
          title: "payment Options",
          icon: "payment",
          callback: () => {
            console.log("pressed language");
          },
        },
        {
          title: "Transaction History",
          icon: "history",
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

export default ProfileTab;

const styles = StyleSheet.create({
  panelWrapper: {
    width: "100%",
    gap: 5,
  },
});
