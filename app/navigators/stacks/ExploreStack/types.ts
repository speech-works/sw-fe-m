import { RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MoodType } from "../../../api/moodCheck/types";
import { FormConfiguration, PackModule } from "../../../api/packs/types";
import { PackContext } from "../../../utils/packActivityNavigation";

export type ExploreStackParamList = {
  // `scrollToJumpIn` scrolls the page to the Jump in practice grid. Passed by
  // DonePractice's "Explore More" and the Home priority card's EXPLORE_JUMP_IN
  // intent (screens/Home/components/IdentityBlock/PriorityCard/intents.ts); the screen
  // already read it, the type just never admitted it.
  Explore: { scrollToJumpIn?: boolean } | undefined;
  DailyPracticeStack: undefined;
  LibraryStack: undefined;
  // `scrollTo` opens the report AT something rather than at the top. Both
  // targets live on the Lifetime tab, so the screen switches tab as well as
  // scrolling. "achievements" comes from Home's Level card, "growth" from
  // Home's GrowthSummary.
  ProgressDetail: { scrollTo?: "achievements" | "growth" } | undefined;
  PaymentStack: undefined;
  Programs: undefined;
  ProgramDetail: { catalogKey: string; packId: string | null };
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
  Breathing: { guidedActivity?: any; packContext?: PackContext; from?: "HOME" | "EXPLORE" | "MOOD_CHECK" | "FIRST_CALL" } | undefined;
  Meditation: { guidedActivity?: any; packContext?: PackContext; from?: "HOME" | "EXPLORE" | "MOOD_CHECK" } | undefined;
  Reframe: { guidedActivity?: any; packContext?: PackContext; from?: "HOME" | "EXPLORE" | "MOOD_CHECK" } | undefined;
  RealLifeChallenge:
    | { guidedActivity?: any; packContext?: PackContext; from?: "HOME" | "EXPLORE" | "MOOD_CHECK" }
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
  PhoneCall: { practiceActivity?: any; packContext?: PackContext; from?: "HOME" | "EXPLORE" | "MOOD_CHECK" } | undefined;
  TongueTwister:
    | { practiceActivity?: any; packContext?: PackContext; from?: "HOME" | "EXPLORE" | "MOOD_CHECK" }
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
  CVExercise: { practiceActivity?: any; packContext?: PackContext; from?: "HOME" | "EXPLORE" | "MOOD_CHECK" } | undefined;
  Poem: { practiceActivity?: any; packContext?: PackContext; from?: "HOME" | "EXPLORE" | "MOOD_CHECK" } | undefined;
  Story: { practiceActivity?: any; packContext?: any; from?: "HOME" | "EXPLORE" | "MOOD_CHECK" } | undefined;
  Quote: { practiceActivity?: any; packContext?: PackContext; from?: "HOME" | "EXPLORE" | "MOOD_CHECK" } | undefined;
  MoodCheckStack:
    | { screen: "FollowUpStack"; params: { mood: MoodType } }
    | { screen: "CheckIn" };
};

export type ExploreStackNavigationProp<T extends keyof ExploreStackParamList> =
  NativeStackNavigationProp<ExploreStackParamList, T>;

export type ExploreStackRouteProp<T extends keyof ExploreStackParamList> =
  RouteProp<ExploreStackParamList, T>;
