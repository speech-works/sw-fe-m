import { CheerType } from "../api/buddies";
import { PostActivityKind } from "../api/posts";
export interface CheerOption {
  type: CheerType;
  emoji: string;
  label: string;
}

/**
 * Master catalog of every cheer. All effort/courage framed — NEVER fluency/outcome.
 * Reactions are contextual to the practice (a phone-call exposure gets "That took
 * courage", a meditation gets "So centered") while staying canned (no free text).
 */
export const CHEER_CATALOG: Record<CheerType, CheerOption> = {
  proud: { type: "proud", emoji: "🤗", label: "Proud of you" },
  keep_going: { type: "keep_going", emoji: "💪", label: "Keep going" },
  well_done: { type: "well_done", emoji: "👏", label: "Well done" },
  high_five: { type: "high_five", emoji: "🙌", label: "High five" },
  courage: { type: "courage", emoji: "🦁", label: "That took courage" },
  brave: { type: "brave", emoji: "✨", label: "So brave" },
  centered: { type: "centered", emoji: "🧘", label: "So centered" },
  consistent: { type: "consistent", emoji: "🔥", label: "Consistency!" },
};

/** Canned, one-tap encouragements buddies can send. No free text → nothing to moderate. */
export const BUDDY_CHEERS: CheerOption[] = [
  CHEER_CATALOG.proud,
  CHEER_CATALOG.keep_going,
  CHEER_CATALOG.well_done,
  CHEER_CATALOG.high_five,
];

/** Contextual reaction sets per activity kind (effort/courage only). */
const SETS: Record<PostActivityKind, CheerType[]> = {
  EXPOSURE_PRACTICE: ["courage", "brave", "proud", "high_five"],
  COGNITIVE_PRACTICE: ["centered", "proud", "keep_going", "high_five"],
  READING_PRACTICE: ["proud", "well_done", "keep_going", "high_five"],
  FUN_PRACTICE: ["well_done", "high_five", "proud", "keep_going"],
  TECHNIQUE_PRACTICE: ["consistent", "well_done", "keep_going", "high_five"],
};

/** Cheers to offer when reacting to a post of the given activity kind (falls back to the general set). */
export const getCheersForActivity = (kind?: PostActivityKind): CheerOption[] => {
  const ids = (kind && SETS[kind]) || BUDDY_CHEERS.map((c) => c.type);
  return ids.map((id) => CHEER_CATALOG[id]);
};
