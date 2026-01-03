import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { FontAwesome5 } from "@expo/vector-icons";
import { theme } from "../Theme/tokens";

import OnboardingQuestions from "../components/OnBoarding/OnboardingQuestions";
import { questions } from "../data/onboardingQuestions";
import { ROUTE_NAMES } from "../constants/routes";
import AcademyStackNavigator from "./stacks/AcademyStack";
import SettingsStackNavigator from "./stacks/SettingsStack";
import Home from "../screens/Home";
import Explore from "../screens/Explore";
import ExploreStackNavigator from "./stacks/ExploreStack";

import CustomTabBar from "../components/CustomTabBar";

const Tab = createBottomTabNavigator();

const BottomTabNavigator = () => {
  const Onboarding = () => {
    return (
      <OnboardingQuestions
        questions={questions}
        onAnswer={(q, a) => {
          console.log(q, a);
        }}
      />
    );
  };

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
        options={{ tabBarLabel: "Explore" }}
      />
      <Tab.Screen
        name={ROUTE_NAMES.COMMUNITY}
        component={Onboarding}
        options={{ tabBarLabel: "Community" }}
      />
      <Tab.Screen
        name={ROUTE_NAMES.SETTINGS}
        component={SettingsStackNavigator}
        options={{ tabBarLabel: "Settings" }}
      />
      {/* <Tab.Screen name={ROUTE_NAMES.THERAPY} component={Logout} /> */}
    </Tab.Navigator>
  );
};

export default BottomTabNavigator;
