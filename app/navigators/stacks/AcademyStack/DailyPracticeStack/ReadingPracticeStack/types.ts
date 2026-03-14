import { CompositeNavigationProp, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AcademyStackParamList } from "../../types";

export type RDPStackParamList = {
  ReadingPractice: undefined;
  StoryPractice:
    | {
        packContext?: { packId: string; moduleId: string; blockIndex?: number };
        practiceActivity?: any;
      }
    | undefined;
  PoemPractice:
    | {
        packContext?: { packId: string; moduleId: string; blockIndex?: number };
        practiceActivity?: any;
      }
    | undefined;
  QuotePractice:
    | {
        packContext?: { packId: string; moduleId: string; blockIndex?: number };
      }
    | undefined;
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
