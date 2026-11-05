import {
  FormFieldType,
  type FormBlockContent,
  type FormConfiguration,
  type FormField,
} from "../../api/packs/types";

/**
 * The words on a FORM step, on the day screen and on the form screen.
 *
 * WHY THESE LIVE HERE. The server maps a form to `configuration` with the
 * form's one-line description in `title` and an EMPTY `description`
 * (mapFormToFrontendSchema). So a card that printed `configuration.description`
 * printed nothing, and the day's own text for the step (`descriptionOverride`)
 * was never shown anywhere. Kept pure so the choice is testable without a
 * React Native tree.
 */

/** Title and body of a FORM card. Same precedence as the ACTIVITY card. */
export function formCardText(content: FormBlockContent | undefined): {
  title: string;
  body: string;
} {
  const config = content?.configuration;
  return {
    title: content?.titleOverride || config?.title || "Reflection",
    body: content?.descriptionOverride || config?.description || "",
  };
}

/**
 * Title and intro line of the form screen.
 *
 * The title is the step's name, the one on the card the user just tapped. The
 * intro is the form's own one-line description, which says what the fields
 * are and reads the same wherever the form is used.
 *
 * `descriptionOverride` is deliberately NOT used here. It is written for the
 * card on the day screen, and ten of the catalogue's final-day cards say
 * "Your logs from the week are shown above", which is true only there.
 *
 * Without a titleOverride this returns what the screen showed before: the
 * form's description as the title and the (empty) configured description.
 */
export function formScreenHeader(
  configuration: FormConfiguration | undefined,
  titleOverride?: string,
  descriptionOverride?: string,
): { title: string; description: string } {
  // A step with its own words on the day card shows the same words here. The
  // shared form's summary described boxes the day had renamed, for example
  // "another possible reason" on a day whose last box asks for the times that
  // went fine (founder, B12, 2026-11-05).
  const own = descriptionOverride?.trim();
  if (titleOverride?.trim() && own) return { title: titleOverride.trim(), description: own };
  const summary = configuration?.title?.trim() || "";
  const title = titleOverride?.trim() || summary || "Reflection";
  // Compared without the full stop: "Your replies." under "Your replies" is
  // the same words twice.
  const same = (a: string, b: string) =>
    a.replace(/[.!?]+$/, "").toLowerCase() === b.replace(/[.!?]+$/, "").toLowerCase();
  const fallback = configuration?.description?.trim() || "";
  const description =
    summary && !same(summary, title)
      ? summary
      : same(fallback, title)
        ? ""
        : fallback;
  return { title, description };
}

/**
 * The guess step: a form placed right before a step, asking what the person
 * thinks will happen. The server key is SystemFormKey.PROGRAM_GUESS_BEFORE.
 */
export const GUESS_FORM_KEY = "activity.program_guess_before";

/**
 * The button on a FORM card. The guess names what it asks for. A form that
 * opens with a scale or a choice says "Answer", since nothing is written
 * first. Every other form says "Start writing".
 */
export function formStartLabel(
  formKey: string | undefined,
  fields?: FormField[],
): string {
  if (formKey === GUESS_FORM_KEY) return "Write your guess";
  const first = fields?.[0]?.type;
  return first && first !== FormFieldType.TEXT_INPUT ? "Answer" : "Start writing";
}

/**
 * What the sheet says after a form is saved. The guess says where it will
 * come back, so the person knows writing it down was not the end of it.
 */
export function formSavedMessage(formKey: string | undefined): {
  title: string;
  body: string;
} {
  if (formKey === GUESS_FORM_KEY) {
    return {
      title: "Guess saved",
      body: "You will see it again after the step.",
    };
  }
  return {
    title: "Saved",
    body: "",
  };
}

/**
 * The answers a form opens with. A text box the server sent a `defaultValue`
 * for starts with that text: the person's own earlier answer, which the day
 * asked to carry over (Panic Button day 7 builds the card from earlier days).
 * They can change or clear it, and whatever is in the box is what is saved.
 *
 * Every other field starts empty, as before. A slider in particular is never
 * given a starting number: see the note on SliderField.
 */
export function initialFormAnswers(
  configuration: FormConfiguration | undefined,
): Record<string, string> {
  const answers: Record<string, string> = {};
  for (const field of configuration?.fields ?? []) {
    if (
      field.type === FormFieldType.TEXT_INPUT &&
      typeof field.defaultValue === "string" &&
      field.defaultValue.trim()
    ) {
      answers[field.id] = field.defaultValue;
    }
  }
  return answers;
}

/**
 * A pick-list answer after tapping `option`: ticked if it was not, unticked if
 * it was. Kept in the order of the options, so the saved list reads the same
 * way as the screen.
 */
export function toggleTick(
  value: unknown,
  option: string,
  options: string[],
): string[] {
  const ticked = new Set(Array.isArray(value) ? (value as string[]) : []);
  if (ticked.has(option)) ticked.delete(option);
  else ticked.add(option);
  return options.filter((o) => ticked.has(o));
}

/**
 * The answer that turns the rest of a log into optional boxes.
 *
 * Two logs open with "Did you do today's step?" and offer "Not today". The
 * boxes after it ask what happened, so after "Not today" there is nothing to
 * write, and a required box kept Save switched off (Panic Button walk P2,
 * 2026-11-06). The server sends options as their labels, so the label is the
 * value the screen holds.
 */
export const NOT_TODAY = "Not today";

/** True when someone answered "Not today" to a one-answer question on this form. */
export function saidNotToday(
  fields: FormField[],
  answers: Record<string, unknown>,
): boolean {
  return fields.some(
    (f) =>
      f.type === FormFieldType.MULTIPLE_CHOICE &&
      f.multiple !== true &&
      answers[f.id] === NOT_TODAY,
  );
}

/**
 * Whether a field must be filled before Save. After "Not today" only the
 * question that holds that answer stays required.
 */
export function isFieldRequired(
  field: FormField,
  fields: FormField[],
  answers: Record<string, unknown>,
): boolean {
  if (!field.required) return false;
  if (!saidNotToday(fields, answers)) return true;
  return answers[field.id] === NOT_TODAY;
}
