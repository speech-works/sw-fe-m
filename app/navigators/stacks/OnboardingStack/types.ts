import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";

export type OnboardingStackParamList = {
  OnboardingWelcome: undefined;

  // screenNumber used to drive question screen selection
  OnboardingQuestion: {
    screenNumber: number;
  };

  OnboardingDone: undefined;
  Academy: undefined;
};

export type OnboardingStackNavigationProp<
  T extends keyof OnboardingStackParamList
> = NativeStackNavigationProp<OnboardingStackParamList, T>;

export type OnboardingStackRouteProp<T extends keyof OnboardingStackParamList> =
  RouteProp<OnboardingStackParamList, T>;
