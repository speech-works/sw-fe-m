import {
  ContentBlockType,
  type FormBlockContent,
  type ModuleContentBlock,
} from "../../api/packs/types";

/**
 * ===========================================================================
 * WHEN A DAY IS FETCHED AGAIN
 * ---------------------------------------------------------------------------
 * The day screen builds the day once, when it opens. Two kinds of block are
 * built by the server from this person's answers:
 *
 *   - WEEK_REVIEW: what they logged, and the willingness numbers.
 *   - a FORM whose box opens with an earlier answer (`prefillFrom`).
 *
 * Panic Button day 7 asks the willingness question one step above its "Your
 * week" review. The review was built before that answer existed, so it showed
 * the day 1 number as the latest one.
 *
 * So when a step is saved, the day is fetched again, but only when one of
 * those blocks comes AFTER the saved step. Everything else on a day is built
 * from the program, not from answers, and a fetch would cost a request for
 * nothing. Most days have neither block and never fetch again.
 * ===========================================================================
 */

/** Steps saved since the day screen last looked, per day. */
const savedSteps = new Map<string, Set<string>>();
const dayKey = (packId: string, moduleId: string) => `${packId}:${moduleId}`;

/** The form screen calls this after a save, before it goes back to the day. */
export const noteStepSaved = (packId: string, moduleId: string, blockId: string) => {
  const key = dayKey(packId, moduleId);
  const steps = savedSteps.get(key) ?? new Set<string>();
  steps.add(blockId);
  savedSteps.set(key, steps);
};

/** Reads and forgets, so one save causes at most one fetch. */
export const takeSavedSteps = (packId: string, moduleId: string): string[] => {
  const key = dayKey(packId, moduleId);
  const steps = savedSteps.get(key);
  savedSteps.delete(key);
  return steps ? [...steps] : [];
};

/** True for a block the server builds from this person's answers. */
export const buildsFromAnswers = (block: Pick<ModuleContentBlock, "type" | "content">): boolean => {
  if (block.type === ContentBlockType.WEEK_REVIEW) return true;
  if (block.type !== ContentBlockType.FORM) return false;
  const overrides = (block.content as FormBlockContent | undefined)?.fieldOverrides ?? {};
  return Object.values(overrides).some((o) => !!o?.prefillFrom);
};

/**
 * PURE. Whether the day has to be fetched again: some step in `changed` has a
 * block built from answers after it. A block before the saved step cannot
 * have used the new answer, so it does not count.
 */
export const needsDayRefetch = (
  blocks: Pick<ModuleContentBlock, "id" | "type" | "content">[],
  changed: Iterable<string>,
): boolean => {
  const ids = new Set(changed);
  if (ids.size === 0) return false;
  let afterChange = false;
  for (const block of blocks) {
    if (afterChange && buildsFromAnswers(block)) return true;
    if (ids.has(block.id)) afterChange = true;
  }
  return false;
};

/**
 * PURE. The ACTIVITY blocks whose current attempt finished after the day was
 * loaded. A thought step's saved replies are shown in the week review, so
 * finishing one counts as a save. `finishedAtLoad` is every finished activity
 * id the phone knew of when the content arrived, so a step finished before
 * that never counts.
 */
export const finishedSince = (
  blocks: Pick<ModuleContentBlock, "id" | "type">[],
  blockToActivity: Map<string, string>,
  finishedAtLoad: Set<string>,
  isFinished: (activityId: string) => boolean,
): string[] =>
  blocks
    .filter((block) => block.type === ContentBlockType.ACTIVITY)
    .filter((block) => {
      const activityId = blockToActivity.get(block.id);
      return !!activityId && !finishedAtLoad.has(activityId) && isFinished(activityId);
    })
    .map((block) => block.id);

/**
 * PURE. Where the person is after the day is fetched again: on the same
 * block, found by id. The list is normally identical. If that block is gone,
 * they stay at the same position, kept inside the new list.
 */
export const sameBlockIndex = (
  before: Pick<ModuleContentBlock, "id">[],
  after: Pick<ModuleContentBlock, "id">[],
  index: number,
): number => {
  const id = before[index]?.id;
  const found = id ? after.findIndex((b) => b.id === id) : -1;
  if (found >= 0) return found;
  return Math.max(0, Math.min(index, after.length - 1));
};
