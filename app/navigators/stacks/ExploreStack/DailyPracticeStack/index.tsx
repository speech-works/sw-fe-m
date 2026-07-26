import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";
import DailyPractice from "../../../../screens/Academy/DailyPractice";
import { DPStackParamList } from "./types";

import CDPStackNavigator from "./CognitivePracticeStack";
import EDPStackNavigator from "./ExposureStack";
import FDPStackNavigator from "./FunPracticeStack";
import RDPStackNavigator from "./ReadingPracticeStack";

const Stack = createNativeStackNavigator<DPStackParamList>();

export default function DPStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DailyPractice" component={DailyPractice} />
      <Stack.Screen name="ReadingPracticeStack" component={RDPStackNavigator} />
      <Stack.Screen name="FunPracticeStack" component={FDPStackNavigator} />
      <Stack.Screen
        name="CognitivePracticeStack"
        component={CDPStackNavigator}
      />
      <Stack.Screen name="ExposureStack" component={EDPStackNavigator} />

      {/* Impact Assessment Flow */}


    </Stack.Navigator>
  );
}
