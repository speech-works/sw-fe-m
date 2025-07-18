import React, { useEffect } from "react";
import BottomTabNavigator from "./BottomTabNavigator";
import { getMyUser } from "../api/users";
import { useUserStore } from "../stores/user";

export default function AppNavigator() {
  const { setUser } = useUserStore();
  useEffect(() => {
    console.log("AppNavigator mounted");
    return () => {
      console.log("AppNavigator unmounted");
    };
  }, []);

  useEffect(() => {
    getMyUser()
      .then((user) => {
        setUser(user);
      })
      .catch((error) => {
        console.error("Error fetching current user:", error);
      });
  }, []);

  return <BottomTabNavigator />;
}
