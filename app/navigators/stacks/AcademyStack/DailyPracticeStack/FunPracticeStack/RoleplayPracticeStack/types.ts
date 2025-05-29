import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";

export type RoleplayFDPStackParamList = {
  RoleplayList: undefined;
  RoleplayBriefing: {
    title: string;
    description: string;
  };
  RoleplayChat: {
    title: string;
  };
};
export type RoleplayFDPStackNavigationProp<
  T extends keyof RoleplayFDPStackParamList
> = NativeStackNavigationProp<RoleplayFDPStackParamList, T>;
export type RoleplayFDPStackRouteProp<
  T extends keyof RoleplayFDPStackParamList
> = RouteProp<RoleplayFDPStackParamList, T>;
