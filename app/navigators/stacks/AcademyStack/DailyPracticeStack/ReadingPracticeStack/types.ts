import { CompositeNavigationProp, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AcademyStackParamList } from "../../types";

export type RDPStackParamList = {
  ReadingPractice: undefined;
  StoryPractice: {
    packContext?: { packId: string; moduleId: string; blockIndex?: number };
    practiceActivity?: any;
  };
  PoemPractice: {
    packContext?: { packId: string; moduleId: string; blockIndex?: number };
    practiceActivity?: any;
  };
  QuotePractice: {
    packContext?: { packId: string; moduleId: string; blockIndex?: number };
  };
};
export type RDPStackNavigationProp<T extends keyof RDPStackParamList> =
  CompositeNavigationProp<
    NativeStackNavigationProp<RDPStackParamList, T>,
    NativeStackNavigationProp<AcademyStackParamList>
  >;
export type RDPStackRouteProp<T extends keyof RDPStackParamList> = RouteProp<
  RDPStackParamList,
  T
>;
