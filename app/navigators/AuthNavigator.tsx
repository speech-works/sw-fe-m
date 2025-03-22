import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import Login from "../screens/Login";
import Signup from "../screens/Signup";
import useScrollWrapper from "../hooks/useScrollWrapper";

const Stack = createNativeStackNavigator();

export default function AuthNavigator() {
  const ScrollWrapper = useScrollWrapper();
  const ScrollableLogin = () => {
    return (
      <ScrollWrapper>
        <Login />
      </ScrollWrapper>
    );
  };
  const ScrollableSignup = () => {
    return (
      <ScrollWrapper>
        <Signup />
      </ScrollWrapper>
    );
  };
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={ScrollableLogin} />
      <Stack.Screen name="Signup" component={ScrollableSignup} />
    </Stack.Navigator>
  );
}
