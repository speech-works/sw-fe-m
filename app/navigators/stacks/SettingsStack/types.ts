import { RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

export type SettingsStackParamList = {
  Settings: undefined;
  ProgressDetail: { scrollTo?: "achievements" } | undefined;
  Preferences: undefined;
  Privacy: undefined;
  HelpSupport: undefined;
  PaymentStack: undefined;
  Reminders: undefined;
  ConfigureReminder: { reminderId?: string };
  ReportProblem: undefined;
  ContactSupport: undefined;
  Feedback: undefined;
  FearedSounds: undefined;
  ReadingVoice: undefined;
  Appearance: undefined;
  BlockedPeople: undefined;
  Discoverability: undefined;
};
export type SettingsStackNavigationProp<
  T extends keyof SettingsStackParamList,
> = NativeStackNavigationProp<SettingsStackParamList, T>;
export type SettingsStackRouteProp<T extends keyof SettingsStackParamList> =
  RouteProp<SettingsStackParamList, T>;
