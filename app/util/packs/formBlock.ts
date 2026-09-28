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
