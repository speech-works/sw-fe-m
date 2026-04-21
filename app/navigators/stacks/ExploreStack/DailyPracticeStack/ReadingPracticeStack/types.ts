import { CompositeNavigationProp, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ExploreStackParamList } from "../../types";
import { PackContext } from "../../../../../../utils/packActivityNavigation";

export type RDPStackParamList = {
  ReadingPractice: undefined;
  StoryPractice:
    | {
        packContext?: PackContext;
        practiceActivity?: any;
      }
    | undefined;
  PoemPractice:
    | {
        packContext?: PackContext;
        practiceActivity?: any;
      }
    | undefined;
  QuotePractice:
    | {
        packContext?: PackContext;
      }
    | undefined;
};
export type RDPStackNavigationProp<T extends keyof RDPStackParamList> =
  CompositeNavigationProp<
    NativeStackNavigationProp<RDPStackParamList, T>,
    NativeStackNavigationProp<ExploreStackParamList>
  >;
export type RDPStackRouteProp<T extends keyof RDPStackParamList> = RouteProp<
  RDPStackParamList,
  T
>;
