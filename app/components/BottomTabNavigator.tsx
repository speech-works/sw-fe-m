import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { View, Text } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { theme } from "../Theme/tokens";

import Home from "../screens/Home";
import Signup from "../screens/Signup";
import useScrollWrapper from "../hooks/useScrollWrapper";

// Create Bottom Tab Navigator
const Tab = createBottomTabNavigator();

const BottomTabNavigator = () => {
  const ScrollWrapper = useScrollWrapper();

  const ScrollableHome = () => {
    return (
      <ScrollWrapper>
        <Home />
      </ScrollWrapper>
    );
  };
  const ScrollableReports = () => {
    return (
      <ScrollWrapper>
        <Signup />
      </ScrollWrapper>
    );
  };
  const ScrollableSettings = () => {
    return (
      <ScrollWrapper>
        <Home />
      </ScrollWrapper>
    );
  };

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false, // Hide header for all screens
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
      <Tab.Screen name="Home" component={ScrollableHome} />
      <Tab.Screen name="Reports" component={ScrollableReports} />
      <Tab.Screen name="Settings" component={ScrollableSettings} />
    </Tab.Navigator>
  );
};

export default BottomTabNavigator;
