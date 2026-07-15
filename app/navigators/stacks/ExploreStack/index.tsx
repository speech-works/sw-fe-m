import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";
import Breathing from "../../../screens/Academy/DailyPractice/pages/CognitivePractice/Breathing";
import Meditation from "../../../screens/Academy/DailyPractice/pages/CognitivePractice/Meditation";
import Reframe from "../../../screens/Academy/DailyPractice/pages/CognitivePractice/Reframe";
import RealLifeChallenge from "../../../screens/Academy/DailyPractice/pages/RealLifeChallenge";
import InterviewBriefing from "../../../screens/Academy/DailyPractice/pages/Exposure/Interview/Briefing";
import InterviewChat from "../../../screens/Academy/DailyPractice/pages/Exposure/Interview/Chat";
import PhoneCall from "../../../screens/Academy/DailyPractice/pages/Exposure/PhoneCall";
import SCBriefing from "../../../screens/Academy/DailyPractice/pages/Exposure/SocialChallenge/Briefing";
import SCChat from "../../../screens/Academy/DailyPractice/pages/Exposure/SocialChallenge/Chat";
import CVExercise from "../../../screens/Academy/DailyPractice/pages/FunPractice/CharacterVoice/CVExercise";
import RoleplayBriefing from "../../../screens/Academy/DailyPractice/pages/FunPractice/Roleplay/Briefing";
import RoleplayChat from "../../../screens/Academy/DailyPractice/pages/FunPractice/Roleplay/Chat";
import PackBriefingWrapper from "../../../screens/Academy/DailyPractice/pages/FunPractice/Roleplay/PackBriefingWrapper";
import TongueTwister from "../../../screens/Academy/DailyPractice/pages/FunPractice/Twister";
import PackFormScreen from "../../../screens/Academy/PackFormScreen";
import PackModuleScreen from "../../../screens/Academy/PackModule";
import ProgressDetail from "../../../screens/Academy/ProgressDetail";
import PoemPractice from "../../../screens/Academy/DailyPractice/pages/ReadingPractice/PoemPractice";
import QuotePractice from "../../../screens/Academy/DailyPractice/pages/ReadingPractice/QuotePractice";
import StoryPractice from "../../../screens/Academy/DailyPractice/pages/ReadingPractice/StoryPractice";
import Explore from "../../../screens/Explore";
import ProgramsScreen from "../../../screens/Programs";
import PaymentStackNavigator from "../PaymentStack";
import DPStackNavigator from "./DailyPracticeStack";
import LibStackNavigator from "./LibraryStack";
import MoodCheckStackNavigator from "./MoodCheckStack";
import { ExploreStackParamList } from "./types";

const Stack = createNativeStackNavigator<ExploreStackParamList>();

export default function ExploreStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Explore" component={Explore} />
      <Stack.Screen name="DailyPracticeStack" component={DPStackNavigator} />
      <Stack.Screen name="LibraryStack" component={LibStackNavigator} />
      <Stack.Screen name="ProgressDetail" component={ProgressDetail} />
      <Stack.Screen name="Programs" component={ProgramsScreen} />
      <Stack.Screen name="MoodCheckStack" component={MoodCheckStackNavigator} />
      <Stack.Screen name="PackModule" component={PackModuleScreen} />
      <Stack.Screen name="PackForm" component={PackFormScreen} />
      <Stack.Screen
        name="Breathing"
        component={Breathing}
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen
        name="Meditation"
        component={Meditation}
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen
        name="Reframe"
        component={Reframe}
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen
        name="RealLifeChallenge"
        component={RealLifeChallenge}
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen name="SCBriefing" component={SCBriefing} />
      <Stack.Screen
        name="SCChat"
        component={SCChat}
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen name="InterviewBriefing" component={InterviewBriefing} />
      <Stack.Screen
        name="InterviewChat"
        component={InterviewChat}
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen
        name="PhoneCall"
        component={PhoneCall}
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen
        name="TongueTwister"
        component={TongueTwister}
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen name="RoleplayBriefing" component={RoleplayBriefing} />
      <Stack.Screen
        name="RoleplayPackBriefing"
        component={PackBriefingWrapper}
      />
      <Stack.Screen
        name="RoleplayChat"
        component={RoleplayChat}
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen
        name="CVExercise"
        component={CVExercise}
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen
        name="Poem"
        component={PoemPractice}
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen
        name="Story"
        component={StoryPractice}
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen
        name="Quote"
        component={QuotePractice}
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen name="PaymentStack" component={PaymentStackNavigator} />
    </Stack.Navigator>
  );
}
