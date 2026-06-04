import { CheerType } from "../api/buddies";

export interface CheerOption {
  type: CheerType;
  emoji: string;
  label: string;
}

/** Canned, one-tap encouragements buddies can send. No free text → nothing to moderate. */
export const BUDDY_CHEERS: CheerOption[] = [
  { type: "proud", emoji: "🤗", label: "Proud of you" },
  { type: "keep_going", emoji: "💪", label: "Keep going" },
  { type: "well_done", emoji: "👏", label: "Well done" },
  { type: "high_five", emoji: "🙌", label: "High five" },
];
