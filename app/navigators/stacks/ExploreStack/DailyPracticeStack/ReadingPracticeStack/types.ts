import { CompositeNavigationProp, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ExploreStackParamList } from "../../types";
import { PackContext } from "../../../../../utils/packActivityNavigation";

export type RDPStackParamList = {
  ReadingPractice: undefined;
  StoryPractice:
  | {
    packContext?: PackContext;
    practiceActivity?: any;
    from?: "HOME" | "EXPLORE" | "MOOD_CHECK";
  }
  | undefined;
  PoemPractice:
  | {
    packContext?: PackContext;
    practiceActivity?: any;
    from?: "HOME" | "EXPLORE" | "MOOD_CHECK";
  }
  | undefined;
  QuotePractice:
  | {
    packContext?: PackContext;
    from?: "HOME" | "EXPLORE" | "MOOD_CHECK";
  }
  | undefined;
  WordPractice:
  | {
    packContext?: PackContext;
    from?: "HOME" | "EXPLORE" | "MOOD_CHECK";
  }
  | undefined;
  PhrasePractice:
  | {
    packContext?: PackContext;
    from?: "HOME" | "EXPLORE" | "MOOD_CHECK";
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
