import { RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MoodType } from "../../../api/moodCheck/types";
import { FormConfiguration, PackModule } from "../../../api/packs/types";
import { PackContext } from "../../../utils/packActivityNavigation";

export type ExploreStackParamList = {
  Explore: undefined;
  DailyPracticeStack: undefined;
  LibraryStack: undefined;
  ProgressDetail: { scrollTo?: "achievements" } | undefined;
  PaymentStack: undefined;
  PackModule: {
    module?: PackModule;
    packId: string;
    moduleId?: string;
    initialBlockIndex?: number;
  };
  PackForm: {
    configuration: FormConfiguration;
    formId: string;
    packId: string;
    moduleId: string;
    blockId: string;
  };
  Breathing: { guidedActivity?: any; packContext?: PackContext } | undefined;
  Meditation: { guidedActivity?: any; packContext?: PackContext } | undefined;
  Reframe: { guidedActivity?: any; packContext?: PackContext } | undefined;
  RealLifeChallenge:
    | { guidedActivity?: any; packContext?: PackContext }
    | undefined;
  SCBriefing:
    | { sc?: any; practiceActivity?: any; packContext?: PackContext }
    | undefined;
  SCChat:
    | { sc?: any; practiceActivityId?: string; packContext?: PackContext }
    | undefined;
  InterviewBriefing:
    | { interview?: any; practiceActivity?: any; packContext?: PackContext }
    | undefined;
  InterviewChat:
    | { interview?: any; practiceActivityId?: string; packContext?: PackContext }
    | undefined;
  PhoneCall: { practiceActivity?: any; packContext?: PackContext } | undefined;
  TongueTwister:
    | { practiceActivity?: any; packContext?: PackContext }
    | undefined;
  RoleplayBriefing:
    | {
        id?: string;
        title?: string;
        description?: string;
        roleplay?: any;
        practiceActivity?: any;
        packContext?: PackContext;
      }
    | undefined;
  RoleplayPackBriefing:
    | {
        id?: string;
        title?: string;
        description?: string;
        roleplay?: any;
        practiceActivity?: any;
        packContext?: PackContext;
      }
    | undefined;
  RoleplayChat:
    | {
        id?: string;
        title?: string;
        roleplay?: any;
        selectedRoleName?: string;
        practiceActivity?: any;
        packContext?: PackContext;
      }
    | undefined;
  CVExercise: { practiceActivity?: any; packContext?: PackContext } | undefined;
  Poem: { practiceActivity?: any; packContext?: PackContext } | undefined;
  Story: { practiceActivity?: any; packContext?: any } | undefined;
  Quote: { practiceActivity?: any; packContext?: PackContext } | undefined;
  MoodCheckStack:
    | { screen: "FollowUpStack"; params: { mood: MoodType } }
    | { screen: "CheckIn" };
};

export type ExploreStackNavigationProp<T extends keyof ExploreStackParamList> =
  NativeStackNavigationProp<ExploreStackParamList, T>;

export type ExploreStackRouteProp<T extends keyof ExploreStackParamList> =
  RouteProp<ExploreStackParamList, T>;
