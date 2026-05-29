import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";

import { MoodType } from "../../../../../api/moodCheck/types";
import FollowUp from "../../../../../screens/Academy/components/MoodCheck/FollowUp";
import Breathing from "../../../../../screens/Academy/DailyPractice/pages/CognitivePractice/Breathing";
import Meditation from "../../../../../screens/Academy/DailyPractice/pages/CognitivePractice/Meditation";
import Reframe from "../../../../../screens/Academy/DailyPractice/pages/CognitivePractice/Reframe";
import StoryPractice from "../../../../../screens/Academy/DailyPractice/pages/ReadingPractice/StoryPractice";
import RealLifeChallenge from "../../../../../screens/Academy/DailyPractice/pages/RealLifeChallenge";
import QuotePractice from "../../../../../screens/Academy/DailyPractice/pages/ReadingPractice/QuotePractice";
import PoemPractice from "../../../../../screens/Academy/DailyPractice/pages/ReadingPractice/PoemPractice";
import Exposure from "../../../../../screens/Academy/DailyPractice/pages/Exposure";
import Twister from "../../../../../screens/Academy/DailyPractice/pages/FunPractice/Twister";
import Briefing from "../../../../../screens/Academy/DailyPractice/pages/FunPractice/Roleplay/Briefing";
import CVExercise from "../../../../../screens/Academy/DailyPractice/pages/FunPractice/CharacterVoice/CVExercise";
import FunPracticeStackNavigator from "../../DailyPracticeStack/FunPracticeStack";
import RoleplayFDPStackNavigator from "../../DailyPracticeStack/FunPracticeStack/RoleplayPracticeStack";
import TechniquePage from "../../../../../screens/Academy/Library/TechniquePage";
import SummaryPage from "../../../../../screens/Academy/Library/TechniquePage/SummaryPage";
import { MoodFUStackParamList } from "./types";

const Stack = createNativeStackNavigator<MoodFUStackParamList>();

interface MoodFUStackNavigatorProps {
  initialMood: MoodType;
}

export default function MoodFUStackNavigator({
  initialMood,
}: MoodFUStackNavigatorProps) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="FollowUp"
        component={FollowUp}
        initialParams={{ mood: initialMood }}
      />
      <Stack.Screen name="BreathingPractice" component={Breathing} />
      <Stack.Screen
        name="MeditationPractice"
        component={Meditation}
        initialParams={{ mood: initialMood }}
      />
      <Stack.Screen name="ReframePractice" component={Reframe} />
      <Stack.Screen
        name="RoleplayPracticeStack"
        component={RoleplayFDPStackNavigator}
      />
      <Stack.Screen name="StoryPractice" component={StoryPractice} />
      <Stack.Screen name="QuotePractice" component={QuotePractice} />
      <Stack.Screen name="PoemPractice" component={PoemPractice} />
      <Stack.Screen name="RealLifeChallenge" component={RealLifeChallenge} />
      <Stack.Screen name="ExposurePractice" component={Exposure} />
      <Stack.Screen name="TwisterPracticeStack" component={FunPracticeStackNavigator} />
      <Stack.Screen name="TwisterExercise" component={Twister} />
      <Stack.Screen name="RoleplayBriefing" component={Briefing} />
      <Stack.Screen name="CVExercise" component={CVExercise} />
      <Stack.Screen name="TechniquePage" component={TechniquePage} />
      <Stack.Screen name="SummaryPage" component={SummaryPage} />
    </Stack.Navigator>
  );
}
