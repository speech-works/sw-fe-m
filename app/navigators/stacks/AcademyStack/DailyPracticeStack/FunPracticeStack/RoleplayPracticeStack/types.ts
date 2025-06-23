import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";
import { RolePlayData } from "../../../../../../api/dailyPractice/types";

export type RoleplayFDPStackParamList = {
  RoleplayList: undefined;
  RoleplayBriefing: {
    id: string;
    title: string;
    description: string;
    roleplay: RolePlayData;
  };
  RoleplayChat: {
    id: string;
    title: string;
    roleplay: RolePlayData;
    selectedRoleName: string;
  };
};
export type RoleplayFDPStackNavigationProp<
  T extends keyof RoleplayFDPStackParamList
> = NativeStackNavigationProp<RoleplayFDPStackParamList, T>;
export type RoleplayFDPStackRouteProp<
  T extends keyof RoleplayFDPStackParamList
> = RouteProp<RoleplayFDPStackParamList, T>;
