import { CompositeNavigationProp, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RolePlayData } from "../../../../../../api/dailyPractice/types";
import { AcademyStackParamList } from "../../../types";

export type RoleplayFDPStackParamList = {
  RoleplayList: undefined;
  RoleplayBriefing: {
    id: string;
    title: string;
    description: string;
    roleplay: RolePlayData;
    packContext?: { packId: string; moduleId: string; blockIndex?: number };
  };
  RoleplayChat: {
    id: string;
    title: string;
    roleplay: RolePlayData;
    selectedRoleName: string;
    packContext?: { packId: string; moduleId: string; blockIndex?: number };
  };
};
export type RoleplayFDPStackNavigationProp<
  T extends keyof RoleplayFDPStackParamList,
> = CompositeNavigationProp<
  NativeStackNavigationProp<RoleplayFDPStackParamList, T>,
  NativeStackNavigationProp<AcademyStackParamList>
>;
export type RoleplayFDPStackRouteProp<
  T extends keyof RoleplayFDPStackParamList,
> = RouteProp<RoleplayFDPStackParamList, T>;
