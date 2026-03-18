import { RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MoodType } from "../../../api/moodCheck/types";
import { FormConfiguration, PackModule } from "../../../api/packs/types";

export type AcademyStackParamList = {
  Academy: undefined;
  DailyPracticeStack: undefined;
  LibraryStack: undefined;
  ChallengesStack: undefined;
  ProgressDetailStack: undefined;
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
  Breathing: { guidedActivity?: any; packContext?: any } | undefined;
  Meditation: { guidedActivity?: any; packContext?: any } | undefined;
  Reframe: { guidedActivity?: any; packContext?: any } | undefined;
  RealLifeChallenge: { guidedActivity?: any; packContext?: any } | undefined;
  // Exposure screens for pack navigation
  SCBriefing:
    | { sc?: any; practiceActivity?: any; packContext?: any }
    | undefined;
  SCChat:
    | { sc?: any; practiceActivityId?: string; packContext?: any }
    | undefined;
  InterviewBriefing:
    | { interview?: any; practiceActivity?: any; packContext?: any }
    | undefined;
  InterviewChat:
    | { interview?: any; practiceActivityId?: string; packContext?: any }
    | undefined;
  PhoneCall: { practiceActivity?: any; packContext?: any } | undefined;
  // Fun practice screens for pack navigation
  TongueTwister: { practiceActivity?: any; packContext?: any } | undefined;
  RoleplayBriefing:
    | {
        id?: string;
        title?: string;
        description?: string;
        roleplay?: any;
        practiceActivity?: any;
        packContext?: any;
      }
    | undefined;
  RoleplayPackBriefing:
    | {
        id?: string;
        title?: string;
        description?: string;
        roleplay?: any;
        practiceActivity?: any;
        packContext?: any;
      }
    | undefined;
  RoleplayChat:
    | {
        id?: string;
        title?: string;
        roleplay?: any;
        selectedRoleName?: string;
        practiceActivity?: any;
        packContext?: any;
      }
    | undefined;
  CVExercise: { practiceActivity?: any; packContext?: any } | undefined;
  // Reading practice screens for pack navigation
  Poem: { practiceActivity?: any; packContext?: any } | undefined;
  Story: { practiceActivity?: any; packContext?: any } | undefined;
  Quote: { practiceActivity?: any; packContext?: any } | undefined;
  MoodCheckStack:
    | { screen: "FollowUpStack"; params: { mood: MoodType } }
    | { screen: "CheckIn" };
};
export type AcademyStackNavigationProp<T extends keyof AcademyStackParamList> =
  NativeStackNavigationProp<AcademyStackParamList, T>;
export type AcademyStackRouteProp<T extends keyof AcademyStackParamList> =
  RouteProp<AcademyStackParamList, T>;
