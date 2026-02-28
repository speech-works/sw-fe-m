import { CompositeNavigationProp, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { CharacterVoiceData } from "../../../../../../api/dailyPractice/types";
import { AcademyStackParamList } from "../../../types";

export type CharacterVoiceFDPStackParamList = {
  CVHome: undefined;
  CVExercise: {
    id: string;
    name: string;
    cvData: CharacterVoiceData;
    packContext?: { packId: string; moduleId: string; blockIndex?: number };
  };
};
export type CharacterVoiceFDPStackNavigationProp<
  T extends keyof CharacterVoiceFDPStackParamList,
> = CompositeNavigationProp<
  NativeStackNavigationProp<CharacterVoiceFDPStackParamList, T>,
  NativeStackNavigationProp<AcademyStackParamList>
>;
export type CharacterVoiceFDPStackRouteProp<
  T extends keyof CharacterVoiceFDPStackParamList,
> = RouteProp<CharacterVoiceFDPStackParamList, T>;
