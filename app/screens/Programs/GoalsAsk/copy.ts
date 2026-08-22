import { GoalAnswerType } from "../../../api/programGoals/types";

/**
 * The only strings this flow owns.
 *
 * Everything the USER reads about their own program comes from the server: the
 * question, the verb, the cues, the order prompt. What lives here is the
 * scaffolding around it, and it has to bend for the one program that collects
 * predictions rather than deeds. "What happened to each one" is right for
 * "Call the landlord" and wrong for "they will finish my word".
 */
export const ASK_COPY = {
  /** Under the input group. Never a hard limit, never red. */
  lengthHint: "A few words is enough.",

  /**
   * Shown once, after every slot is filled, when the answers look thin.
   *
   * It is a nudge and nothing else. We never reject an answer: somebody who
   * writes "Amma" has answered the question, and telling them they are wrong at
   * the moment they are being honest is how you lose them on day 1.
   */
  thinHint: "Where and when? A little more helps you later.",

  cueLabel: "Tap to use",

  order: {
    /** Under the order prompt. The last one needs no tap. */
    help: "Tap them in the order you want.",
    reset: "Start over",
  },

  confirm: {
    title: "Your three",
    /** The promise the report gate keeps. Different for a prediction. */
    promise: (kind: GoalAnswerType) =>
      kind === "prediction"
        ? "On the last day we will ask if each one happened."
        : "On the last day we will ask what happened to each one.",
    /**
     * Says the quiet part out loud. A person about to type three real names
     * deserves to know nobody else will read them.
     */
    privacy: "Only you see these.",
    start: "Start day 1",
    edit: "Change my answers",
  },
} as const;

/** "Your three", "Your five". The count changes; Word Swap asks for 5. */
export const countWord = (n: number) =>
  ({ 3: "three", 4: "four", 5: "five", 6: "six" })[n] ?? String(n);
