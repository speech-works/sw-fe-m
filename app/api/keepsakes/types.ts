/**
 * Mirrors `Keepsake` in sw-be-2/src/services/formResponse.service.ts.
 *
 * The answers arrive READY TO PRINT. Choice fields are stored as machine values
 * like "when_natural", and the server resolves those to their labels before
 * sending, so the app never needs a copy of every form's option list to draw a
 * card. Do not add option handling here.
 */
export interface KeepsakeAnswer {
  /** The question, in the words it was asked. */
  label: string;
  /** The answer, already readable. */
  value: string;
}

export interface Keepsake {
  formKey: string;
  /** What the card is for, one line. */
  title: string;
  /** The program it came out of, when the submission recorded one. */
  packId: string | null;
  packTitle: string | null;
  /** Unanswered fields are already dropped by the server. */
  answers: KeepsakeAnswer[];
  completedAt: string;
}
