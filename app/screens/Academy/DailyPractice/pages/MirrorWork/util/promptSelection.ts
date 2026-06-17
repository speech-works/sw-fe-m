import { MirrorWorkCognitivePrompt } from "../types";

// The one topic we never lead a session with (heaviest/most sensitive). It can
// still appear later in the session — this only protects the opening slot.
export const STUTTERING_CATEGORY = "SPEECH_STUTTERING";

const DEFAULT_SESSION_SIZE = 12;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Round-robin across categories so consecutive prompts vary in theme instead of
 * 20 of the same category in a row. Category order + within-category order are
 * shuffled each call.
 */
function interleaveByCategory(
  prompts: MirrorWorkCognitivePrompt[],
): MirrorWorkCognitivePrompt[] {
  const byCat = new Map<string, MirrorWorkCognitivePrompt[]>();
  for (const p of shuffle(prompts)) {
    if (!byCat.has(p.category)) byCat.set(p.category, []);
    byCat.get(p.category)!.push(p);
  }
  const cats = shuffle([...byCat.keys()]);
  const out: MirrorWorkCognitivePrompt[] = [];
  let added = true;
  while (added) {
    added = false;
    for (const c of cats) {
      const list = byCat.get(c)!;
      if (list.length) {
        out.push(list.shift()!);
        added = true;
      }
    }
  }
  return out;
}

export interface PromptSelection {
  /** Ordered list for the session: [fresh opener, ...interleaved variety]. */
  prompts: MirrorWorkCognitivePrompt[];
  /** Opener id to persist as "seen" so the next session opens on something else. */
  openerId: string | null;
}

/**
 * Build a session's prompt list:
 *  - OPENER: a prompt the user hasn't opened a recent session with, drawn from
 *    every topic EXCEPT speech/stuttering (never lead with the heaviest topic).
 *    When every eligible opener has been used, the cursor cycles.
 *  - REST: theme-interleaved variety drawn from ALL topics (incl. stuttering),
 *    so every topic is reachable from day one.
 *
 * Pure (given the RNG). `seenOpenerIds` is the only state.
 */
export function selectSessionPrompts(
  all: MirrorWorkCognitivePrompt[],
  seenOpenerIds: string[],
  sessionSize: number = DEFAULT_SESSION_SIZE,
): PromptSelection {
  if (!all.length) return { prompts: [], openerId: null };

  const seen = new Set(seenOpenerIds);
  const openerEligible = all.filter((p) => p.category !== STUTTERING_CATEGORY);

  // Prefer an unseen eligible opener; if all eligible are seen, cycle (reset).
  let openerPool = openerEligible.filter((p) => !seen.has(p.id));
  if (openerPool.length === 0) {
    openerPool = openerEligible.length ? openerEligible : all; // cycle / degenerate fallback
  }
  const opener = shuffle(openerPool)[0];

  const rest = interleaveByCategory(
    all.filter((p) => p.id !== opener.id),
  ).slice(0, Math.max(0, sessionSize - 1));

  return { prompts: [opener, ...rest], openerId: opener.id };
}
