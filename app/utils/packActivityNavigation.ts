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
 *
 * EVERY CALL BELOW USES `push`, NOT `navigate` — and that is load-bearing.
 * These screen names (RealLifeChallenge, Breathing, SCBriefing, ...) are
 * shared across every day of every program, so the same name is revisited
 * constantly. `navigate()` to a route already sitting somewhere in the stack's
 * history does not open a new screen: it jumps BACK to that old instance,
 * silently popping everything above it — including the PackModule the user
 * was just on. The next "Start Practice" tap would land on a stale screen
 * from a previous day, and Back from there would exit past the current
 * module entirely. `push` always adds a fresh instance on top, so `goBack()`
 * lands exactly one step back — on the module screen the activity was
 * launched from — every time.
 *
 * The one exception is `MirrorWorkPrep`: it lives in a different, nested
 * navigator (DailyPracticeStack → CognitivePracticeStack) rather than
 * directly in this one, so `push` — which only pushes within the CURRENT
 * stack — cannot reach it. It keeps `navigate`'s cross-tree resolution.
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
      nav.push("Breathing", {
        practiceActivity: activity,
        packContext: ctx,
      });
      break;
    case CognitivePracticeType.GUIDED_MEDITATION:
      nav.push("Meditation", {
        practiceActivity: activity,
        packContext: ctx,
      });
      break;
    case CognitivePracticeType.REFRAMING_THOUGHTS:
      nav.push("Reframe", { practiceActivity: activity, packContext: ctx });
      break;
    case CognitivePracticeType.MIRROR_WORK:
      // Pack already created+started the activity (alreadyStarted), so PrepScreen
      // reuses it via the double-start guard rather than creating a new one.
      // Stays `navigate` — see the note above `navigateToPackActivity`.
      nav.navigate("MirrorWorkPrep", {
        practiceData: { cognitivePractice },
        practiceActivity: activity,
        packContext: ctx,
      });
      break;
    case CognitivePracticeType.REAL_LIFE_CHALLENGE:
      nav.push("RealLifeChallenge", {
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
      nav.push("SCBriefing", {
        sc: exposurePractice,
        practiceActivity: activity,
        packContext: ctx,
      });
      break;
    case ExposurePracticeType.INTERVIEW_SIMULATION:
      nav.push("InterviewBriefing", {
        interview: exposurePractice,
        practiceActivity: activity,
        packContext: ctx,
      });
      break;
    case ExposurePracticeType.PHONE_CALL_SIMULATION:
      nav.push("PhoneCall", {
        practiceActivity: activity,
        packContext: ctx,
      });
      break;
    case ExposurePracticeType.REAL_LIFE_CHALLENGE:
    // Technique drills use the SAME instruction/reflect screen as real-life
    // challenges — the split is a backend classification (keeps the graded
    // -exposure ladder clean), not a different UI.
    case ExposurePracticeType.TECHNIQUE_DRILL:
      nav.push("RealLifeChallenge", {
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
      nav.push("TongueTwister", {
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
      nav.push("RoleplayPackBriefing", {
        id: funPractice.id,
        title: funPractice.name,
        description: funPractice.description,
        roleplay: funPractice.rolePlayData,
        practiceActivity: activity,
        packContext: ctx,
      });
      break;
    case FunPracticeType.CHARACTER_VOICE:
      nav.push("CVExercise", {
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
      nav.push("Poem", { practiceActivity: activity, packContext: ctx });
      break;
    case ReadingPracticeType.STORY:
      nav.push("Story", { practiceActivity: activity, packContext: ctx });
      break;
    case ReadingPracticeType.QUOTE:
      nav.push("Quote", { practiceActivity: activity, packContext: ctx });
      break;
    default:
      console.warn("Unknown reading practice type:", readingPractice.type);
  }
};
