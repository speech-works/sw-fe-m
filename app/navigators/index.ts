import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";

/**
 * The param list for the Auth Navigator.
 * Each key is a route name, and each value is the type of route params.
 */
export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
};

/**
 * A convenience type for screens in the Auth stack.
 * - T is the route name (e.g., "Login")
 */
export type AuthStackNavigationProp<T extends keyof AuthStackParamList> =
  NativeStackNavigationProp<AuthStackParamList, T>;

export type AuthStackRouteProp<T extends keyof AuthStackParamList> = RouteProp<
  AuthStackParamList,
  T
>;
