import { RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RolePlayData } from "../../../../../../api/dailyPractice/types";

export type RoleplayFDPStackParamList = {
  RoleplayList: undefined;
  RoleplayBriefing: {
    id: string;
    title: string;
    description: string;
    roleplay: RolePlayData;
    packContext?: { packId: string; moduleId: string };
  };
  RoleplayChat: {
    id: string;
    title: string;
    roleplay: RolePlayData;
    selectedRoleName: string;
    packContext?: { packId: string; moduleId: string };
  };
};
export type RoleplayFDPStackNavigationProp<
  T extends keyof RoleplayFDPStackParamList,
> = NativeStackNavigationProp<RoleplayFDPStackParamList, T>;
export type RoleplayFDPStackRouteProp<
  T extends keyof RoleplayFDPStackParamList,
> = RouteProp<RoleplayFDPStackParamList, T>;
