import { CompositeNavigationProp, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RolePlayData } from "../../../../../../api/dailyPractice/types";
import { ExploreStackParamList } from "../../../types";
import { PackContext } from "../../../../../../utils/packActivityNavigation";

export type RoleplayFDPStackParamList = {
  RoleplayList: undefined;
  RoleplayBriefing: {
    id: string;
    title: string;
    description: string;
    roleplay: RolePlayData;
    packContext?: PackContext;
  };
  RoleplayChat: {
    id: string;
    title: string;
    roleplay: RolePlayData;
    selectedRoleName: string;
    packContext?: PackContext;
  };
};
export type RoleplayFDPStackNavigationProp<
  T extends keyof RoleplayFDPStackParamList,
> = CompositeNavigationProp<
  NativeStackNavigationProp<RoleplayFDPStackParamList, T>,
  NativeStackNavigationProp<ExploreStackParamList>
>;
export type RoleplayFDPStackRouteProp<
  T extends keyof RoleplayFDPStackParamList,
> = RouteProp<RoleplayFDPStackParamList, T>;
