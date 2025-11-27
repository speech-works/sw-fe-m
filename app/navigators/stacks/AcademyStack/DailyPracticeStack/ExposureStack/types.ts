import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";

export type EDPStackParamList = {
  Exposure: undefined;
  InterviewSimulationStack: undefined;
  SocialChallengeStack: undefined;
  PhoneCallsStack: undefined;
  RandomQuestionsStack: undefined;
  SecondaryBehaviorsStack: undefined;
};
export type EDPStackNavigationProp<T extends keyof EDPStackParamList> =
  NativeStackNavigationProp<EDPStackParamList, T>;
export type EDPStackRouteProp<T extends keyof EDPStackParamList> = RouteProp<
  EDPStackParamList,
  T
>;
