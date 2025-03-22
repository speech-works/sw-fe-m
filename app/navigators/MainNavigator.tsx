import React, { useContext } from "react";
import { AuthContext } from "../contexts/AuthContext";
import AuthNavigator from "./AuthNavigator";
import AppNavigator from "./AppNavigator";

export default function MainNavigator() {
  console.log("MainNavigator rendering");
  const { isLoggedIn } = useContext(AuthContext);

  return isLoggedIn ? <AppNavigator /> : <AuthNavigator />;
}
