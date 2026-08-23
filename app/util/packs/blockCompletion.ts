/**
 * ===========================================================================
 * A FINISHED STEP STAYS FINISHED
 * ---------------------------------------------------------------------------
 * Completion of an interactive block (ACTIVITY or FORM) is MONOTONIC. Once a
 * step has been done, nothing the user does afterwards can take it back.
 *
 * ── WHY THIS NEEDS TO BE A RULE AND NOT AN ACCIDENT ────────────────────────
 * PackModule derives ACTIVITY completion by looking up the block's activity id
 * in `blockToActivityMap` and asking the activity store whether THAT activity
 * is complete. The map holds one id per block and is persisted, so it survives
 * a remount — which is the only reason a finished step still reads "Completed"
 * when you come back to it.
 *
 * The moment a block can be RETRIED, that derivation turns into a trap:
 * starting the activity again creates a NEW activity, overwrites the block's
 * entry in the map, and persists it. Finish the retry and nothing changes.
 * Abandon it — close the app, get interrupted, change your mind — and the
 * block silently reverts to "not done", permanently, because the id of the
 * attempt that WAS finished is gone.
 *
 * So the derived signal may only ever ADD. This module is that rule, kept
 * separate from the screen so it can be tested without a React tree and so the
 * next person to touch the refresh effect has to read it.
 *
 * ── THE SAME RULE THE BACKEND ALREADY KEEPS ────────────────────────────────
 * `PackProgressService.startModule` preserves `COMPLETED` when a finished day
 * is reopened and only increments `attempts`. A day and a step inside it are
 * the same promise at two scales; if revisiting meant "undone" at one scale
 * and "still done" at the other, the same gesture would mean two opposite
 * things in one product.
 * ===========================================================================
 */

/** Where the latch for one module lives. One key per module, not per block. */
export function doneBlocksKey(packId: string, moduleId: string): string {
  return `pack-${packId}-module-${moduleId}-done-blocks`;
}

/**
 * Fold a freshly derived completion set into what we already knew.
 *
 * `derived` is a snapshot of what the store and AsyncStorage can prove RIGHT
 * NOW, and it is allowed to be missing things: a retry in flight, an activity
 * the store has not hydrated, a failed read. `latched` is everything that has
 * ever been true. The union is what the screen should show.
 *
 * Returns the same Set instance when nothing changed, so callers can use it
 * directly in a `setState` updater without forcing a render.
 */
export function mergeBlockCompletion(
  latched: ReadonlySet<string>,
  derived: ReadonlySet<string>,
): Set<string> {
  let grew = false;
  const next = new Set(latched);
  derived.forEach((id) => {
    if (!next.has(id)) {
      next.add(id);
      grew = true;
    }
  });
  return grew ? next : (latched as Set<string>);
}

/** Parse the persisted latch. Anything unreadable is treated as empty. */
export function parseDoneBlocks(raw: string | null): Set<string> {
  if (!raw) return new Set();
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id): id is string => typeof id === "string"));
  } catch {
    return new Set();
  }
}

export function serializeDoneBlocks(ids: ReadonlySet<string>): string {
  return JSON.stringify(Array.from(ids));
}
