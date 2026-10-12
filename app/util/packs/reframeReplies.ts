import type { ReframeReply } from "../../api/practiceActivities/types";

/** A pair as it is shown again: the thought and the reply. */
export type ReframePair = { thought: string; reply: string };

/** The server keeps at most this many pairs per completion. */
export const MAX_SAVED_REPLIES = 20;

const isPair = (v: unknown): v is ReframePair =>
  !!v &&
  typeof (v as any).thought === "string" &&
  typeof (v as any).reply === "string" &&
  (v as any).thought.trim().length > 0 &&
  (v as any).reply.trim().length > 0;

/**
 * Every pair one stored completion kept, in the order saved. Reads the list
 * newer servers store and the single pair older rows have.
 */
export function reframePairs(data: unknown): ReframePair[] {
  if (!data || typeof data !== "object") return [];
  const replies = (data as { replies?: unknown }).replies;
  if (Array.isArray(replies) && replies.length > 0) {
    return replies.filter(isPair).map((r) => ({ thought: r.thought, reply: r.reply }));
  }
  return isPair(data) ? [{ thought: data.thought, reply: data.reply }] : [];
}

/** The pairs the day payload carries for a finished step. */
export function savedPairsFromBlock(content: {
  savedReframes?: ReframePair[];
  savedReframe?: ReframePair;
}): ReframePair[] {
  if (Array.isArray(content.savedReframes) && content.savedReframes.length > 0) {
    return content.savedReframes.filter(isPair);
  }
  return content.savedReframe && isPair(content.savedReframe) ? [content.savedReframe] : [];
}

/** The box can be saved only with words in it. */
export function canSaveReply(text: string): boolean {
  return text.trim().length > 0;
}

/**
 * Adds what is in the box as a reply to `thought`. Returns the list
 * unchanged when the box is empty, there is no thought, the same pair is
 * already saved, or the list is full.
 */
export function addReply(
  saved: ReframeReply[],
  thought: string | undefined,
  text: string,
): ReframeReply[] {
  const reply = text.trim();
  const t = thought?.trim();
  if (!reply || !t) return saved;
  if (saved.length >= MAX_SAVED_REPLIES) return saved;
  if (saved.some((s) => s.thought === t && s.reply === reply)) return saved;
  return [...saved, { thought: t, reply, source: "written" }];
}

/** The next thought in the day's series, wrapping round to the first. */
export function nextThoughtIndex(index: number, count: number): number {
  return count > 0 ? (index + 1) % count : 0;
}
