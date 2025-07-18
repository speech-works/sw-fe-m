import React, { useEffect } from "react";
import BottomTabNavigator from "./BottomTabNavigator";

export default function AppNavigator() {
  useEffect(() => {
    console.log("AppNavigator mounted");
    return () => {
      console.log("AppNavigator unmounted");
    };
  }, []);

  return <BottomTabNavigator />;
}
