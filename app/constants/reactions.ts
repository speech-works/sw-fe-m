import { ReactionOption, ReactionType } from "../api/threads/types";

/**
 * The Speechworks reactions — ONE small, fixed, branded set shown on EVERY signal (like
 * Facebook's six, but Speechworks-specific and NSA-relatable). Each owns a distinct emotional
 * slot, so one set fits a win OR a struggle — the viewer picks the apt one. NONE reference
 * fluency. This replaces the old 12-type / 4-catalog cheer system; there is no contextual
 * selector. (Sensitive moments swap the chips for the "Reach out" support flow instead.)
 */
export const REACTIONS: ReactionOption[] = [
  { type: "courage", emoji: "🦁", label: "Courage" }, // honor bravery (signature)
  { type: "proud", emoji: "🤗", label: "Proud" }, //     affirm effort, not outcome
  { type: "strength", emoji: "💪", label: "Strength" }, // encourage forward
  { type: "with_you", emoji: "🫂", label: "With you" }, // be present in a hard moment
  { type: "celebrate", emoji: "🙌", label: "Celebrate" }, // mark a win
];

const REACTION_BY_TYPE: Record<ReactionType, ReactionOption> = REACTIONS.reduce(
  (acc, r) => {
    acc[r.type] = r;
    return acc;
  },
  {} as Record<ReactionType, ReactionOption>,
);

/** Resolve a reaction's visuals by type (for rendering received reactions). */
export const getReaction = (type: ReactionType): ReactionOption | undefined =>
  REACTION_BY_TYPE[type];
