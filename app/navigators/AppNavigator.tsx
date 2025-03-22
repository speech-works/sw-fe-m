import React, { useEffect } from "react";
import BottomTabNavigator from "./BottomTabNavigator";

export default function AppNavigator() {
  useEffect(() => {
    console.log("AppNavigator mounted");
    return () => {
      console.log("AppNavigator unmounted");
    };
  }, []);
  // If you have other screens, you can define a stack here.
  // Otherwise, just return the tabs directly:
  return <BottomTabNavigator />;
}
