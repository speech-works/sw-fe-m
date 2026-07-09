import { SupportNoteId } from "../api/threads/types";

/**
 * Canned "reach out" notes for responding to a buddy's *sensitive* (crisis-flagged) moment.
 * Warm, concrete, and presence-first — the goal is to stay with the person and take it
 * seriously, NOT to fix it. Canned → safe for a vulnerable recipient, nothing to moderate.
 * Keep these ids in sync with the BE (used to compose the priority push body).
 */
export interface SupportNote {
  id: SupportNoteId;
  text: string;
}

export const SUPPORT_NOTES: SupportNote[] = [
  { id: "here_for_you", text: "I'm here for you — you're not alone in this." },
  { id: "not_going_anywhere", text: "Thank you for telling me. I'm not going anywhere." },
  { id: "you_matter", text: "You matter to me. Can we talk?" },
];
