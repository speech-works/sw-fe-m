import { CompositeNavigationProp, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { CharacterVoiceData } from "../../../../../../api/dailyPractice/types";
import { PracticeActivity } from "../../../../../../api/practiceActivities/types";
import { ExploreStackParamList } from "../../../types";
import { PackContext } from "../../../../../../utils/packActivityNavigation";

export type CharacterVoiceFDPStackParamList = {
  CVHome: undefined;
  CVExercise: {
    id?: string;
    name?: string;
    cvData?: CharacterVoiceData;
    packContext?: PackContext;
    practiceActivity?: PracticeActivity;
  };
};
export type CharacterVoiceFDPStackNavigationProp<
  T extends keyof CharacterVoiceFDPStackParamList,
> = CompositeNavigationProp<
  NativeStackNavigationProp<CharacterVoiceFDPStackParamList, T>,
  NativeStackNavigationProp<ExploreStackParamList>
>;
export type CharacterVoiceFDPStackRouteProp<
  T extends keyof CharacterVoiceFDPStackParamList,
> = RouteProp<CharacterVoiceFDPStackParamList, T>;
