import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";

export type SettingsStackParamList = {
  Settings: undefined;
  ProgressDetail: undefined;
  Preferences: undefined;
};
export type SettingsStackNavigationProp<
  T extends keyof SettingsStackParamList
> = NativeStackNavigationProp<SettingsStackParamList, T>;
export type SettingsStackRouteProp<T extends keyof SettingsStackParamList> =
  RouteProp<SettingsStackParamList, T>;
