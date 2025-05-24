import React, { useContext } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { View, Text, TouchableOpacity } from "react-native";
import { FontAwesome5 } from "@expo/vector-icons";
import { theme } from "../Theme/tokens";

//import Home from "../screens/Home";
//import Report from "../screens/Report";
import useScrollWrapper from "../hooks/useScrollWrapper";
import { logoutUser } from "../api";
import { AuthContext } from "../contexts/AuthContext";
//import Settings from "../screens/Settings";
// import HomeStackNavigator from "./stacks/HomeStackNavigator";
import * as SecureStore from "expo-secure-store";
import { SECURE_KEYS_NAME } from "../constants/secureStorageKeys";
import OnboardingQuestions from "../components/OnBoarding/OnboardingQuestions";
import { questions } from "../data/onboardingQuestions";
import { ROUTE_NAMES } from "../constants/routes";
import AcademyStackNavigator from "./stacks/AcademyStack";

// Create Bottom Tab Navigator
const Tab = createBottomTabNavigator();

const BottomTabNavigator = () => {
  const { logout } = useContext(AuthContext);
  const handleLogout = async () => {
    const accessToken = await SecureStore.getItemAsync(
      SECURE_KEYS_NAME.SW_APP_JWT_KEY
    );
    const refreshToken = await SecureStore.getItemAsync(
      SECURE_KEYS_NAME.SW_APP_REFRESH_TOKEN_KEY
    );
    console.log("Access Token:", accessToken);
    console.log("Refresh Token:", refreshToken);
    if (refreshToken && accessToken) {
      await logoutUser({ refreshToken, appJwt: accessToken });
      logout();
    }
  };

  const ScrollWrapper = useScrollWrapper();
  const Logout = () => {
    return (
      <ScrollWrapper>
        <Text>Home</Text>

        <TouchableOpacity
          onPress={() => {
            console.log("Logout button pressed");
            handleLogout();
          }}
          style={{
            backgroundColor: theme.colors.actionPrimary.default,
            padding: 10,
            borderRadius: 5,
            marginTop: 20,
          }}
        >
          <Text style={{ color: "white" }}>Logout</Text>
        </TouchableOpacity>
      </ScrollWrapper>
    );
  };

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
      screenOptions={({ route }) => ({
        headerShown: false, // Hide header for all screens
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === ROUTE_NAMES.ACADEMY) {
            iconName = "user-graduate";
          } else if (route.name === ROUTE_NAMES.COMMUNITY) {
            iconName = "users";
          } else if (route.name === ROUTE_NAMES.THERAPY) {
            iconName = "user-md";
          }

          return (
            <FontAwesome5 name={iconName as any} size={size} color={color} />
          );
        },
        tabBarActiveTintColor: theme.colors.actionPrimary.default,
        tabBarInactiveTintColor: theme.colors.text.default,
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
      <Tab.Screen
        name={ROUTE_NAMES.ACADEMY}
        component={AcademyStackNavigator}
      />
      <Tab.Screen name={ROUTE_NAMES.COMMUNITY} component={Onboarding} />
      <Tab.Screen name={ROUTE_NAMES.THERAPY} component={Logout} />
    </Tab.Navigator>
  );
};

export default BottomTabNavigator;
