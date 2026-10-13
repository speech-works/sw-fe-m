import type {
  FormBlockContent,
  FormConfiguration,
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
): { title: string; description: string } {
  const summary = configuration?.title?.trim() || "";
  const title = titleOverride?.trim() || summary || "Reflection";
  const description =
    summary && summary !== title
      ? summary
      : configuration?.description?.trim() || "";
  return { title, description };
}

/**
 * The guess step: a form placed right before a step, asking what the person
 * thinks will happen. The server key is SystemFormKey.PROGRAM_GUESS_BEFORE.
 */
export const GUESS_FORM_KEY = "activity.program_guess_before";

/**
 * The button on a FORM card. Every form says "Start Reflection" except the
 * guess, which is not a reflection: nothing has happened yet to reflect on.
 */
export function formStartLabel(formKey: string | undefined): string {
  return formKey === GUESS_FORM_KEY ? "Write your guess" : "Start Reflection";
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
    title: "Reflection Saved",
    body: "Your response has been recorded.",
  };
}
