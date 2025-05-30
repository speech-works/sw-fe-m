import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { FontAwesome5 } from "@expo/vector-icons";
import { theme } from "../Theme/tokens";

import Settings from "../screens/Settings";
import OnboardingQuestions from "../components/OnBoarding/OnboardingQuestions";
import { questions } from "../data/onboardingQuestions";
import { ROUTE_NAMES } from "../constants/routes";
import AcademyStackNavigator from "./stacks/AcademyStack";

// Create Bottom Tab Navigator
const Tab = createBottomTabNavigator();

const BottomTabNavigator = () => {
  // const Logout = () => {
  //   return (
  //     <ScrollWrapper>
  //       <Text>Home</Text>

  //       <TouchableOpacity
  //         onPress={() => {
  //           console.log("Logout button pressed");
  //           handleLogout();
  //         }}
  //         style={{
  //           backgroundColor: theme.colors.actionPrimary.default,
  //           padding: 10,
  //           borderRadius: 5,
  //           marginTop: 20,
  //         }}
  //       >
  //         <Text style={{ color: "white" }}>Logout</Text>
  //       </TouchableOpacity>
  //     </ScrollWrapper>
  //   );
  // };

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
          } else if (route.name === ROUTE_NAMES.SETTINGS) {
            iconName = "cog";
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
      <Tab.Screen name={ROUTE_NAMES.SETTINGS} component={Settings} />
      {/* <Tab.Screen name={ROUTE_NAMES.THERAPY} component={Logout} /> */}
    </Tab.Navigator>
  );
};

export default BottomTabNavigator;
