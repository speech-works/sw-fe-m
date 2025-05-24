import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import Auth from "../screens/Auth";
// import useScrollWrapper from "../hooks/useScrollWrapper";

const Stack = createNativeStackNavigator();

export default function AuthNavigator() {
  // const ScrollWrapper = useScrollWrapper();
  // const ScrollableAuth = () => {
  //   return (
  //     <ScrollWrapper>
  //       <Auth />
  //     </ScrollWrapper>
  //   );
  // };

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Auth" component={Auth} />
    </Stack.Navigator>
  );
}
