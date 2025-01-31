import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { theme } from "../Theme/tokens";

// Dummy Screens (Replace these with your actual screens)
const HomeScreen = () => <View style={{ flex: 1, backgroundColor: "#fff" }} />;
const ReportsScreen = () => (
  <View style={{ flex: 1, backgroundColor: "#fff" }} />
);
const SettingsScreen = () => (
  <View style={{ flex: 1, backgroundColor: "#fff" }} />
);

// Create Bottom Tab Navigator
const Tab = createBottomTabNavigator();

const BottomTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === "Home") {
            iconName = "home";
          } else if (route.name === "Reports") {
            iconName = "assignment";
          } else if (route.name === "Settings") {
            iconName = "settings";
          }

          return (
            <View
              style={{
                padding: 6,
                borderRadius: 6,
                borderWidth: focused ? 2 : 0, // Highlight active tab
                borderColor: focused
                  ? theme.colors.actionPrimary.default
                  : "transparent",
                alignItems: "center",
                justifyContent: "center",
                height: size + 16,
                width: size + 16,
              }}
            >
              <MaterialIcons name={iconName as any} size={size} color={color} />
            </View>
          );
        },
        tabBarActiveTintColor: theme.colors.actionPrimary.default,
        tabBarInactiveTintColor: theme.colors.neutral[5],
        tabBarShowLabel: false, // Hide text labels
        tabBarStyle: {
          backgroundColor: "white",
          borderTopWidth: 1,
          borderTopColor: "#E5E7EB",
          height: 60,
          paddingTop: 12,
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Reports" component={ReportsScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
};

export default BottomTabNavigator;
