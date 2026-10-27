/**
 * The goal as one sentence, the same way the server's composeGoal builds it
 * (sw-be-2 src/util/goalQuestionGates.ts). Keep the two in step.
 *
 * - "Call {}" + "the landlord" reads "Call the landlord".
 * - "{} again" + "call someone" reads "Call someone again": only the first
 *   letter of the sentence is raised.
 * - An answer that is already an action keeps its own verb: "ask her out"
 *   under "Say {}" reads "Ask her out", never "Say ask her out".
 */
const GOAL_ACTION_WORDS = new Set([
  "ask", "tell", "say", "call", "phone", "text", "message", "invite", "kiss", "hug", "hold",
  "talk", "speak", "introduce", "meet", "share", "admit", "order", "answer", "explain",
  "flirt", "propose", "compliment", "go",
]);

export function composeGoal(verb: string, noun: string): string {
  const first = noun.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
  if (!verb.startsWith("{}") && GOAL_ACTION_WORDS.has(first)) {
    const own = noun.trim();
    return own.charAt(0).toUpperCase() + own.slice(1);
  }
  const text = verb.replace("{}", noun);
  return verb.startsWith("{} ") ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}
