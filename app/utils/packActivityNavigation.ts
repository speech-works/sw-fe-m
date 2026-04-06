import {
    CognitivePracticeType,
    ExposurePracticeType,
    FunPracticeType,
    PracticeActivity,
    ReadingPracticeType,
} from "../api";

export interface PackContext {
  blockId?: string;
  moduleId: string;
  packId: string;
  blockIndex?: number;
  /** If true, the activity was already started (stamina checked) by ContentRenderer. Skip the start call. */
  alreadyStarted?: boolean;
}

/**
 * Navigates to the appropriate practice screen for a pack module activity.
 * Maps PracticeActivity → specific screen based on contentType and practice type.
 */
export const navigateToPackActivity = (
  navigation: any,
  activity: PracticeActivity,
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
  activity: PracticeActivity,
  ctx: PackContext,
) => {
  const { cognitivePractice } = activity;

  if (!cognitivePractice) {
    console.error("Missing cognitivePractice data");
    return;
  }

  switch (cognitivePractice.type) {
    case CognitivePracticeType.GUIDED_BREATHING:
      nav.navigate("Breathing", {
        practiceActivity: activity,
        packContext: ctx,
      });
      break;
    case CognitivePracticeType.GUIDED_MEDITATION:
      nav.navigate("Meditation", {
        practiceActivity: activity,
        packContext: ctx,
      });
      break;
    case CognitivePracticeType.REFRAMING_THOUGHTS:
      nav.navigate("Reframe", { practiceActivity: activity, packContext: ctx });
      break;
    case CognitivePracticeType.POSITIVE_AFFIRMATIONS:
      // TODO: Add affirmations screen navigation
      console.warn("POSITIVE_AFFIRMATIONS screen not yet implemented");
      break;
    case CognitivePracticeType.REAL_LIFE_CHALLENGE:
      nav.navigate("RealLifeChallenge", {
        practiceActivity: activity,
        packContext: ctx,
      });
      break;
    default:
      console.warn("Unknown cognitive practice type:", cognitivePractice.type);
  }
};

const navigateToExposure = (
  nav: any,
  activity: PracticeActivity,
  ctx: PackContext,
) => {
  const { exposurePractice } = activity;

  if (!exposurePractice) {
    console.error("Missing exposurePractice data");
    return;
  }

  switch (exposurePractice.type) {
    case ExposurePracticeType.SOCIAL_CHALLENGE_SIMULATION:
      nav.navigate("SCBriefing", {
        sc: exposurePractice,
        practiceActivity: activity,
        packContext: ctx,
      });
      break;
    case ExposurePracticeType.INTERVIEW_SIMULATION:
      nav.navigate("InterviewBriefing", {
        interview: exposurePractice,
        practiceActivity: activity,
        packContext: ctx,
      });
      break;
    case ExposurePracticeType.PHONE_CALL_SIMULATION:
      nav.navigate("PhoneCall", {
        practiceActivity: activity,
        packContext: ctx,
      });
      break;
    case ExposurePracticeType.REAL_LIFE_CHALLENGE:
      nav.navigate("RealLifeChallenge", {
        practiceActivity: activity,
        packContext: ctx,
      });
      break;
    default:
      console.warn("Unknown exposure practice type:", exposurePractice.type);
  }
};

const navigateToFun = (
  nav: any,
  activity: PracticeActivity,
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
        practiceActivity: activity,
        packContext: ctx,
      });
      break;
    case FunPracticeType.ROLE_PLAY:
      console.log("Navigating to ROLE_PLAY briefing (RoleplayPackBriefing)");
      if (!funPractice.rolePlayData) {
        console.warn("No rolePlayData for FunPractice ROLE_PLAY");
        return;
      }
      nav.navigate("RoleplayPackBriefing", {
        id: funPractice.id,
        title: funPractice.name,
        description: funPractice.description,
        roleplay: funPractice.rolePlayData,
        practiceActivity: activity,
        packContext: ctx,
      });
      break;
    case FunPracticeType.CHARACTER_VOICE:
      nav.navigate("CVExercise", {
        practiceActivity: activity,
        packContext: ctx,
      });
      break;
    default:
      console.warn("Unknown fun practice type:", funPractice.type);
  }
};

const navigateToReading = (
  nav: any,
  activity: PracticeActivity,
  ctx: PackContext,
) => {
  const { readingPractice } = activity;

  if (!readingPractice) {
    console.error("Missing readingPractice data");
    return;
  }

  switch (readingPractice.type) {
    case ReadingPracticeType.POEM:
      nav.navigate("Poem", { practiceActivity: activity, packContext: ctx });
      break;
    case ReadingPracticeType.STORY:
      nav.navigate("Story", { practiceActivity: activity, packContext: ctx });
      break;
    case ReadingPracticeType.QUOTE:
      nav.navigate("Quote", { practiceActivity: activity, packContext: ctx });
      break;
    default:
      console.warn("Unknown reading practice type:", readingPractice.type);
  }
};
