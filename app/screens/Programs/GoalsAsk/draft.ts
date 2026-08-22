/**
 * The rules the ask flow runs on, out of the components so they can be tested.
 * Each one exists because of an edge case that is easy to get wrong and
 * impossible to see in a screenshot.
 */

/**
 * One example per slot.
 *
 * The seed carries three real answers in one comma-separated string. Showing
 * all three in the first box reads as "type the lot in here". Showing one per
 * box shows the shape of a SINGLE answer, which is what we are asking for.
 *
 * Falls back to the last example when a program asks for more slots than the
 * placeholder has examples: Word Swap asks 5 and its placeholder names 3.
 */
export function placeholderFor(placeholder: string, index: number): string {
  const examples = placeholder
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (examples.length === 0) return "";
  return examples[index] ?? examples[examples.length - 1];
}

/**
 * Whether to show the one soft line about saying more.
 *
 * A single word is a COMPLETE answer when the question asks for a person:
 * "Amma" is a whole answer and nudging there is rude. Everywhere else a single
 * word usually means they have not said which call, or when.
 *
 * Only once every slot is filled, so nobody is corrected mid-typing.
 */
export function looksThin(values: string[], noun: string): boolean {
  if (noun === "person") return false;
  if (!values.every((v) => v.trim().length > 0)) return false;
  return values.some((v) => v.trim().split(/\s+/).length === 1);
}

/**
 * Which slot a tapped cue chip fills.
 *
 * The focused one when it is empty, so tapping does what it looks like it does.
 * Otherwise the first empty one, so a tap never quietly overwrites something
 * they typed. -1 when everything is full: the chips stop doing anything rather
 * than destroying an answer.
 */
export function slotForCue(values: string[], focused: number): number {
  if (values[focused]?.trim().length === 0) return focused;
  return values.findIndex((v) => v.trim().length === 0);
}

/**
 * The order after one tap.
 *
 * ── THE LAST ONE NEEDS NO TAP ──────────────────────────────────────────────
 * With three answers, two taps decide all three. Asking for a third tap on the
 * only remaining option is asking somebody to confirm arithmetic. With five it
 * is four taps.
 */
export function pickNext(
  order: number[],
  index: number,
  count: number,
): number[] {
  if (order.includes(index)) return order;
  const next = [...order, index];
  if (next.length === count - 1) {
    for (let i = 0; i < count; i++) {
      if (!next.includes(i)) {
        next.push(i);
        break;
      }
    }
  }
  return next;
}
