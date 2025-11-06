import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import Library from "../../../../screens/Academy/Library";
import { LibStackParamList } from "./types";
import TechniquePage from "../../../../screens/Academy/Library/TechniquePage";
import SummaryPage from "../../../../screens/Academy/Library/TechniquePage/SummaryPage";
import PaymentStackNavigator from "../../PaymentStack";

const Stack = createNativeStackNavigator<LibStackParamList>();

export default function LibStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Library" component={Library} />
      <Stack.Screen name="TechniquePage" component={TechniquePage} />
      <Stack.Screen name="SummaryPage" component={SummaryPage} />
      <Stack.Screen name="PaymentStack" component={PaymentStackNavigator} />
    </Stack.Navigator>
  );
}
