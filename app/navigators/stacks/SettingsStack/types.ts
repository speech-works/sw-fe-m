import { RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

export type SettingsStackParamList = {
  Settings: undefined;
  ProgressDetail: { scrollTo?: "achievements" } | undefined;
  Preferences: undefined;
  HelpSupport: undefined;
  PaymentStack: undefined;
  Reminders: undefined;
  ConfigureReminder: { reminderId?: string };
};
export type SettingsStackNavigationProp<
  T extends keyof SettingsStackParamList,
> = NativeStackNavigationProp<SettingsStackParamList, T>;
export type SettingsStackRouteProp<T extends keyof SettingsStackParamList> =
  RouteProp<SettingsStackParamList, T>;
