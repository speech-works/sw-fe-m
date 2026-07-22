import { PracticeActivityContentType } from "../../api/practiceActivities/types";

/**
 * Which piece of content is this activity actually about?
 *
 * A PracticeActivity carries its content in one of two slots —
 * `cognitivePractice` or `exposurePractice` — and three separate things need
 * to agree on the answer: the id sent when creating/starting the activity, the
 * content type sent with it, and the title shown to the user.
 *
 * This existed inline on the Real Life Challenge screen, three times, reading
 * the ROUTE PARAM. That was wrong in two ways that only show up on paths the
 * happy case never exercises:
 *
 *   1. The screen can be opened with only an `id` (the Home recommendation
 *      does this) and fetch the activity itself. The route param is undefined
 *      on that path, so contentId was undefined, the activity was never
 *      created, and the user's completed challenge recorded nothing.
 *   2. "Try something easier" swaps a NEW activity into state. The param still
 *      held the original, so the eased attempt was filed against the harder
 *      challenge and the heading kept naming it.
 *
 * Both are the same mistake — deriving from where the screen STARTED instead of
 * what it is showing NOW — so the derivation lives here as one pure function,
 * always applied to the live activity, and is covered by tests.
 */
export interface ActivityContent {
  /** undefined when the activity (or its content) has not loaded yet. */
  contentId: string | undefined;
  contentType: PracticeActivityContentType;
  title: string;
}

export const FALLBACK_TITLE = "Real Life Challenge";

export function deriveActivityContent(
  activity:
    | {
        cognitivePractice?: { id?: string; name?: string } | null;
        exposurePractice?: { id?: string; name?: string } | null;
      }
    | null
    | undefined,
  fallbackTitle: string = FALLBACK_TITLE,
): ActivityContent {
  const cognitive = activity?.cognitivePractice;
  const exposure = activity?.exposurePractice;

  return {
    contentId: cognitive?.id || exposure?.id,
    // Cognitive wins when present; exposure is the default, which also keeps
    // the not-yet-loaded case on the type the challenge screens expect.
    contentType: cognitive
      ? PracticeActivityContentType.COGNITIVE_PRACTICE
      : PracticeActivityContentType.EXPOSURE_PRACTICE,
    title: cognitive?.name || exposure?.name || fallbackTitle,
  };
}
