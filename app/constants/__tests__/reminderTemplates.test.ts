import {
  REMINDER_TEMPLATES,
  CUSTOM_CATEGORY,
  getRandomMessage,
} from "../reminderTemplates";

/**
 * ============================================================================
 * NOTIFICATIONS MAY NOT MAKE A FLUENCY CLAIM
 * ----------------------------------------------------------------------------
 * The sibling of `app/api/dailyPlan/__tests__/labels.test.ts`, which pins the
 * same refusal for the growth-axis labels. That test exists because "Steadier"
 * reads as "my speech is steadier" — so we renamed the axis to Finisher and
 * locked it.
 *
 * Meanwhile FIVE reminder messages said the quiet part out loud, on a schedule,
 * to people who had opted in to hear from us:
 *
 *   "Sharpen your vocal flow"                              (READING description)
 *   "Reading aloud builds confidence and vocal ease."
 *   "Consistent reading practice builds a natural, steady flow."
 *   "Focused breathing helps calm the mind and steady the voice."
 *   "Every exposure practice makes the next one easier."
 *
 * A push notification is the one surface that reaches someone who is not even
 * in the app, and nothing in the file's guidelines forbade it — so nobody
 * caught it. The guideline is written down now, and this is what enforces it.
 *
 * WHY A WORD LIST RATHER THAN REVIEW. The claim is always carried by the same
 * handful of words, and a false positive here costs one rewrite while a false
 * negative ships the thing the product refuses to say. If a legitimate message
 * ever trips this, change the message — the word is doing the damage, not the
 * matcher.
 * ============================================================================
 */

/** Every word that turns a nudge into a claim about how someone sounds. */
const FLUENCY_CLAIM = /flow|ease|easier|easily|smooth|fluen|steady|steadier|stammer|stutter-free/i;

/** Title, body and description are all user-visible; none of them get a pass. */
function allCopy(): { where: string; text: string }[] {
  const out: { where: string; text: string }[] = [];
  for (const t of REMINDER_TEMPLATES) {
    out.push({ where: `${t.category} description`, text: t.description });
    out.push({ where: `${t.category} label`, text: t.label });
    t.messages.forEach((m, i) => {
      out.push({ where: `${t.category} message[${i}] title`, text: m.title });
      out.push({ where: `${t.category} message[${i}] body`, text: m.body });
    });
  }
  out.push({ where: "CUSTOM description", text: CUSTOM_CATEGORY.description });
  out.push({ where: "CUSTOM label", text: CUSTOM_CATEGORY.label });
  return out;
}

describe("Reminder copy", () => {
  it("never claims practice makes speech flow, ease or steady", () => {
    const offenders = allCopy()
      .filter(({ text }) => FLUENCY_CLAIM.test(text))
      .map(({ where, text }) => `${where}: ${JSON.stringify(text)}`);

    expect(offenders).toEqual([]);
  });

  it("covers the fallback message too, which no template owns", () => {
    // `getRandomMessage` returns a hardcoded pair when the category is unknown,
    // so it is reachable copy that the loop above cannot see.
    const { message } = getRandomMessage(
      "NOT_A_REAL_CATEGORY" as never,
    );
    expect(FLUENCY_CLAIM.test(message.title)).toBe(false);
    expect(FLUENCY_CLAIM.test(message.body)).toBe(false);
  });

  it("still says something in every slot", () => {
    // Cheap guard against a rewrite that empties a body rather than fixing it.
    for (const { where, text } of allCopy()) {
      expect(`${where}:${text.trim().length > 0}`).toBe(`${where}:true`);
    }
  });
});
