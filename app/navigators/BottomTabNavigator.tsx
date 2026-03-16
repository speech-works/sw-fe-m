import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { getFocusedRouteNameFromRoute } from "@react-navigation/native";
import React from "react"; // Rebuild trigger

import { ROUTE_NAMES } from "../constants/routes";
import Community from "../screens/Community";
import Home from "../screens/Home";
import ExploreStackNavigator from "./stacks/ExploreStack";
import SettingsStackNavigator from "./stacks/SettingsStack";

import CustomTabBar from "../components/CustomTabBar";

const Tab = createBottomTabNavigator();

const getTabBarVisibility = (route: any, mainScreenName: string) => {
  const routeName = getFocusedRouteNameFromRoute(route) ?? mainScreenName;
  if (routeName === mainScreenName) {
    return { display: "flex" } as const;
  }
  return { display: "none" } as const;
};

const BottomTabNavigator = () => {

  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false, // Managed by CustomTabBar
        // tabBarStyle and tabBarIcon are now handled by CustomTabBar
      }}
    >
      <Tab.Screen
        name={ROUTE_NAMES.HOME}
        component={Home}
        options={{ tabBarLabel: "Home" }}
      />

      <Tab.Screen
        name={ROUTE_NAMES.EXPLORE}
        component={ExploreStackNavigator}
        options={({ route }) => ({
          tabBarLabel: "Explore",
          tabBarStyle: getTabBarVisibility(route, "Explore"),
        })}
      />
      <Tab.Screen
        name={ROUTE_NAMES.COMMUNITY}
        component={Community}
        options={{ tabBarLabel: "Community" }}
      />
      <Tab.Screen
        name={ROUTE_NAMES.SETTINGS}
        component={SettingsStackNavigator}
        options={({ route }) => ({
          tabBarLabel: "Settings",
          tabBarStyle: getTabBarVisibility(route, "Settings"),
        })}
      />
      {/* <Tab.Screen name={ROUTE_NAMES.THERAPY} component={Logout} /> */}
    </Tab.Navigator>
  );
};

export default BottomTabNavigator;
