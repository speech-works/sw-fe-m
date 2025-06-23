import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";
import { CharacterVoiceData } from "../../../../../../api/dailyPractice/types";

export type CharacterVoiceFDPStackParamList = {
  CVHome: undefined;
  CVExercise: {
    id: string;
    name: string;
    cvData: CharacterVoiceData;
  };
};
export type CharacterVoiceFDPStackNavigationProp<
  T extends keyof CharacterVoiceFDPStackParamList
> = NativeStackNavigationProp<CharacterVoiceFDPStackParamList, T>;
export type CharacterVoiceFDPStackRouteProp<
  T extends keyof CharacterVoiceFDPStackParamList
> = RouteProp<CharacterVoiceFDPStackParamList, T>;
