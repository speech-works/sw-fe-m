import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";
import Academy from "../../../screens/Academy";
import Breathing from "../../../screens/Academy/DailyPractice/pages/CognitivePractice/Breathing";
import Meditation from "../../../screens/Academy/DailyPractice/pages/CognitivePractice/Meditation";
import Reframe from "../../../screens/Academy/DailyPractice/pages/CognitivePractice/Reframe";
import RealLifeChallenge from "../../../screens/Academy/DailyPractice/pages/RealLifeChallenge";
import PackFormScreen from "../../../screens/Academy/PackFormScreen";
import PackModuleScreen from "../../../screens/Academy/PackModule";
import PaymentStackNavigator from "../PaymentStack";
import ChalStackNavigator from "./ChallengesStack";
import DPStackNavigator from "./DailyPracticeStack";
import LibStackNavigator from "./LibraryStack";
import MoodCheckStackNavigator from "./MoodCheckStack";
import PDStackNavigator from "./ProgressDetailStack";
import { AcademyStackParamList } from "./types";
// Exposure: Briefing + Chat screens for pack navigation
import InterviewBriefing from "../../../screens/Academy/DailyPractice/pages/Exposure/Interview/Briefing";
import InterviewChat from "../../../screens/Academy/DailyPractice/pages/Exposure/Interview/Chat";
import PhoneCall from "../../../screens/Academy/DailyPractice/pages/Exposure/PhoneCall";
import SCBriefing from "../../../screens/Academy/DailyPractice/pages/Exposure/SocialChallenge/Briefing";
import SCChat from "../../../screens/Academy/DailyPractice/pages/Exposure/SocialChallenge/Chat";
// Fun practice screens for pack navigation
import CVExercise from "../../../screens/Academy/DailyPractice/pages/FunPractice/CharacterVoice/CVExercise";
import RoleplayBriefing from "../../../screens/Academy/DailyPractice/pages/FunPractice/Roleplay/Briefing";
import RoleplayChat from "../../../screens/Academy/DailyPractice/pages/FunPractice/Roleplay/Chat";
import PackBriefingWrapper from "../../../screens/Academy/DailyPractice/pages/FunPractice/Roleplay/PackBriefingWrapper";
import TongueTwister from "../../../screens/Academy/DailyPractice/pages/FunPractice/Twister";
// Reading practice screens for pack navigation
import PoemPractice from "../../../screens/Academy/DailyPractice/pages/ReadingPractice/PoemPractice";
import QuotePractice from "../../../screens/Academy/DailyPractice/pages/ReadingPractice/QuotePractice";
import StoryPractice from "../../../screens/Academy/DailyPractice/pages/ReadingPractice/StoryPractice";
import ProgressDetail from "../../../screens/Academy/ProgressDetail";

const Stack = createNativeStackNavigator<AcademyStackParamList>();

export default function AcademyStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Academy" component={Academy} />
      <Stack.Screen name="DailyPracticeStack" component={DPStackNavigator} />
      <Stack.Screen name="LibraryStack" component={LibStackNavigator} />
      <Stack.Screen name="ChallengesStack" component={ChalStackNavigator} />
      <Stack.Screen name="ProgressDetailStack" component={PDStackNavigator} />
      <Stack.Screen name="ProgressDetail" component={ProgressDetail} />
      <Stack.Screen name="MoodCheckStack" component={MoodCheckStackNavigator} />
      <Stack.Screen name="PackModule" component={PackModuleScreen} />
      <Stack.Screen name="PackForm" component={PackFormScreen} />
      <Stack.Screen name="Breathing" component={Breathing} />
      <Stack.Screen name="Meditation" component={Meditation} />
      <Stack.Screen name="Reframe" component={Reframe} />
      <Stack.Screen name="RealLifeChallenge" component={RealLifeChallenge} />
      {/* Exposure screens for pack navigation */}
      <Stack.Screen name="SCBriefing" component={SCBriefing} />
      <Stack.Screen name="SCChat" component={SCChat} />
      <Stack.Screen name="InterviewBriefing" component={InterviewBriefing} />
      <Stack.Screen name="InterviewChat" component={InterviewChat} />
      {/* Fun practice screens for pack navigation */}
      <Stack.Screen name="TongueTwister" component={TongueTwister} />
      <Stack.Screen name="RoleplayBriefing" component={RoleplayBriefing} />
      <Stack.Screen
        name="RoleplayPackBriefing"
        component={PackBriefingWrapper}
      />
      <Stack.Screen name="RoleplayChat" component={RoleplayChat} />
      <Stack.Screen name="CVExercise" component={CVExercise} />
      {/* Reading practice screens for pack navigation */}
      <Stack.Screen name="Poem" component={PoemPractice} />
      <Stack.Screen name="Story" component={StoryPractice} />
      <Stack.Screen name="Quote" component={QuotePractice} />
      <Stack.Screen name="PaymentStack" component={PaymentStackNavigator} />
    </Stack.Navigator>
  );
}
