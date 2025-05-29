import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";

export type CharacterVoiceFDPStackParamList = {
  CVHome: undefined;
  CVExercise: {
    name: string;
  };
};
export type CharacterVoiceFDPStackNavigationProp<
  T extends keyof CharacterVoiceFDPStackParamList
> = NativeStackNavigationProp<CharacterVoiceFDPStackParamList, T>;
export type CharacterVoiceFDPStackRouteProp<
  T extends keyof CharacterVoiceFDPStackParamList
> = RouteProp<CharacterVoiceFDPStackParamList, T>;
