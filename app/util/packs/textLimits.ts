import { FormField, FormFieldType } from "../../api/packs/types";

export const wordCount = (text: string): number => {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
};

/**
 * The problem with a typed answer, in one plain sentence, or null when it is
 * fine. A blank answer is never a problem here: an optional field can stay
 * empty. The server checks the same limits again.
 */
export const textFieldProblem = (
  field: FormField,
  raw: unknown,
): string | null => {
  if (field.type !== FormFieldType.TEXT_INPUT) return null;
  if (typeof raw !== "string" || !raw.trim()) return null;
  const words = wordCount(raw);
  const name = field.label.replace(/[?:]+$/, "");
  if (field.minWords !== undefined && words < field.minWords) {
    return `"${name}" needs at least ${field.minWords} words. Yours has ${words}.`;
  }
  return null;
};
