import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";
import ProgressDetail from "../../../screens/Academy/ProgressDetail";
import Settings from "../../../screens/Settings";
import Preferences from "../../../screens/Settings/pages/Preferences";
import Reminders from "../../../screens/Settings/pages/Reminders";
import ConfigureReminder from "../../../screens/Settings/pages/ConfigureReminder";
import Support from "../../../screens/Settings/pages/Support";
import ReportProblem from "../../../screens/Settings/pages/Support/ReportProblem";
import ContactSupport from "../../../screens/Settings/pages/Support/ContactSupport";
import Feedback from "../../../screens/Settings/pages/Support/Feedback";
import FearedSounds from "../../../screens/Settings/pages/FearedSounds";
import PracticeGoal from "../../../screens/Settings/pages/PracticeGoal";
import PaymentStackNavigator from "../PaymentStack";
import { SettingsStackParamList } from "./types";

const Stack = createNativeStackNavigator<SettingsStackParamList>();

export default function SettingsStackNavigator() {
  console.log("in SettingsStackNavigator");
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Settings" component={Settings} />
      <Stack.Screen name="ProgressDetail" component={ProgressDetail} />
      <Stack.Screen name="Preferences" component={Preferences} />
      <Stack.Screen name="HelpSupport" component={Support} />
      <Stack.Screen name="PaymentStack" component={PaymentStackNavigator} />
      <Stack.Screen name="Reminders" component={Reminders} />
      <Stack.Screen name="ConfigureReminder" component={ConfigureReminder} />
      <Stack.Screen name="ReportProblem" component={ReportProblem} />
      <Stack.Screen name="ContactSupport" component={ContactSupport} />
      <Stack.Screen name="Feedback" component={Feedback} />
      <Stack.Screen name="FearedSounds" component={FearedSounds} />
      <Stack.Screen name="PracticeGoal" component={PracticeGoal} />
    </Stack.Navigator>
  );
}
