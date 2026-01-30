import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import DailyPractice from "../../../../screens/Academy/DailyPractice";
import OASESIntro from "../../../../screens/Academy/OASES/OASESIntro";
import OASESQuestions from "../../../../screens/Academy/OASES/OASESQuestions";
import OASESComplete from "../../../../screens/Academy/OASES/OASESComplete";
import { DPStackParamList } from "./types";

import RDPStackNavigator from "./ReadingPracticeStack";
import FDPStackNavigator from "./FunPracticeStack";
import CDPStackNavigator from "./CognitivePracticeStack";
import EDPStackNavigator from "./ExposureStack";

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

      {/* OASES Flow */}
      <Stack.Screen name="OASESIntro" component={OASESIntro} />
      <Stack.Screen name="OASESQuestions" component={OASESQuestions} />
      <Stack.Screen name="OASESComplete" component={OASESComplete} />
    </Stack.Navigator>
  );
}
