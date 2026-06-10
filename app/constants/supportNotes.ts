import { SupportNoteId } from "../api/threads/types";

/**
 * Canned "reach out" notes for responding to a buddy's *sensitive* (crisis-flagged) moment.
 * Warm, concrete, and presence-first — the goal is to stay with the person and take it
 * seriously, NOT to fix it. Canned → safe for a vulnerable recipient, nothing to moderate.
 * Keep these ids in sync with the BE (used to compose the priority push body).
 */
export interface SupportNote {
  id: SupportNoteId;
  emoji: string;
  text: string;
}

export const SUPPORT_NOTES: SupportNote[] = [
  { id: "here_for_you", emoji: "💛", text: "I'm here for you — you're not alone in this." },
  { id: "not_going_anywhere", emoji: "🫂", text: "Thank you for telling me. I'm not going anywhere." },
  { id: "you_matter", emoji: "🤍", text: "You matter to me. Can we talk?" },
];

export const getSupportNote = (id: SupportNoteId): SupportNote =>
  SUPPORT_NOTES.find((n) => n.id === id) ?? SUPPORT_NOTES[0];
