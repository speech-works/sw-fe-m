import { GuidedActivity } from "../api/guidedActivities";
import {
  CognitivePracticeType,
  ExposurePracticeType,
  FunPracticeType,
  ReadingPracticeType,
} from "../api/dailyPractice/types";

export interface PackContext {
  blockId: string;
  moduleId: string;
  packId: string;
}

/**
 * Navigates to the appropriate practice screen for a pack module activity.
 * Maps GuidedActivity → specific screen based on contentType and practice type.
 */
export const navigateToPackActivity = (
  navigation: any,
  activity: GuidedActivity,
  packContext: PackContext,
): void => {
  const { contentType } = activity;

  switch (contentType) {
    case "COGNITIVE_PRACTICE":
      navigateToCognitive(navigation, activity, packContext);
      break;
    case "EXPOSURE_PRACTICE":
      navigateToExposure(navigation, activity, packContext);
      break;
    case "FUN_PRACTICE":
      navigateToFun(navigation, activity, packContext);
      break;
    case "READING_PRACTICE":
      navigateToReading(navigation, activity, packContext);
      break;
    default:
      console.warn("Unknown activity contentType:", contentType);
  }
};

const navigateToCognitive = (
  nav: any,
  activity: GuidedActivity,
  ctx: PackContext,
) => {
  const { cognitivePractice } = activity;

  if (!cognitivePractice) {
    console.error("Missing cognitivePractice data");
    return;
  }

  switch (cognitivePractice.type) {
    case CognitivePracticeType.GUIDED_BREATHING:
      nav.navigate("Breathing", { guidedActivity: activity, packContext: ctx });
      break;
    case CognitivePracticeType.GUIDED_MEDITATION:
      nav.navigate("Meditation", {
        guidedActivity: activity,
        packContext: ctx,
      });
      break;
    case CognitivePracticeType.REFRAMING_THOUGHTS:
      nav.navigate("Reframe", { guidedActivity: activity, packContext: ctx });
      break;
    case CognitivePracticeType.POSITIVE_AFFIRMATIONS:
      // TODO: Add affirmations screen navigation
      console.warn("POSITIVE_AFFIRMATIONS screen not yet implemented");
      break;
    case CognitivePracticeType.REAL_LIFE_CHALLENGE:
      nav.navigate("RealLifeChallenge", {
        guidedActivity: activity,
        packContext: ctx,
      });
      break;
    default:
      console.warn("Unknown cognitive practice type:", cognitivePractice.type);
  }
};

const navigateToExposure = (
  nav: any,
  activity: GuidedActivity,
  ctx: PackContext,
) => {
  const { exposurePractice } = activity;

  if (!exposurePractice) {
    console.error("Missing exposurePractice data");
    return;
  }

  switch (exposurePractice.type) {
    case ExposurePracticeType.SOCIAL_CHALLENGE_SIMULATION:
      nav.navigate("SCChat", {
        sc: {
          name: exposurePractice.name,
          practiceData: exposurePractice.practiceData,
        },
        guidedActivity: activity,
        packContext: ctx,
      });
      break;
    case ExposurePracticeType.INTERVIEW_SIMULATION:
      nav.navigate("InterviewChat", {
        interview: {
          name: exposurePractice.name,
          practiceData: exposurePractice.practiceData,
        },
        guidedActivity: activity,
        packContext: ctx,
      });
      break;
    case ExposurePracticeType.PHONE_CALL_SIMULATION:
      nav.navigate("PhoneCall", { guidedActivity: activity, packContext: ctx });
      break;
    case ExposurePracticeType.REAL_LIFE_CHALLENGE:
      nav.navigate("RealLifeChallenge", {
        guidedActivity: activity,
        packContext: ctx,
      });
      break;
    default:
      console.warn("Unknown exposure practice type:", exposurePractice.type);
  }
};

const navigateToFun = (
  nav: any,
  activity: GuidedActivity,
  ctx: PackContext,
) => {
  const { funPractice } = activity;

  if (!funPractice) {
    console.error("Missing funPractice data");
    return;
  }

  switch (funPractice.type) {
    case FunPracticeType.TONGUE_TWISTER:
      nav.navigate("TongueTwister", {
        guidedActivity: activity,
        packContext: ctx,
      });
      break;
    case FunPracticeType.ROLE_PLAY:
      nav.navigate("RoleplayChat", {
        guidedActivity: activity,
        packContext: ctx,
      });
      break;
    case FunPracticeType.CHARACTER_VOICE:
      nav.navigate("CharacterVoice", {
        guidedActivity: activity,
        packContext: ctx,
      });
      break;
    default:
      console.warn("Unknown fun practice type:", funPractice.type);
  }
};

const navigateToReading = (
  nav: any,
  activity: GuidedActivity,
  ctx: PackContext,
) => {
  const { readingPractice } = activity;

  if (!readingPractice) {
    console.error("Missing readingPractice data");
    return;
  }

  switch (readingPractice.type) {
    case ReadingPracticeType.POEM:
      nav.navigate("Poem", { guidedActivity: activity, packContext: ctx });
      break;
    case ReadingPracticeType.STORY:
      nav.navigate("Story", { guidedActivity: activity, packContext: ctx });
      break;
    case ReadingPracticeType.QUOTE:
      nav.navigate("Quote", { guidedActivity: activity, packContext: ctx });
      break;
    default:
      console.warn("Unknown reading practice type:", readingPractice.type);
  }
};
