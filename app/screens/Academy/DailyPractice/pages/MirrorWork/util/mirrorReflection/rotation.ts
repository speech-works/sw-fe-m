import { RotationState } from "./types";

/**
 * Picks a variant from a pool, avoiding the last index used for that category —
 * the same no-repeat guarantee as constants/reminderTemplates.getRandomMessage.
 * Returns the chosen text and index (index -1 for an empty pool).
 */
export function pickVariant(
  pool: string[],
  category: string,
  state: RotationState,
): { text: string; index: number } {
  if (pool.length === 0) return { text: "", index: -1 };

  const last = state[category];
  let index: number;
  if (last !== undefined && pool.length > 1) {
    // Pick any index except the last used one.
    do {
      index = Math.floor(Math.random() * pool.length);
    } while (index === last);
  } else {
    index = Math.floor(Math.random() * pool.length);
  }
  return { text: pool[index], index };
}

/**
 * Stateful picker used while building one reflection. Works on a COPY of the
 * incoming rotation state; read the updated copy back via `getState()` and
 * persist it so the next session avoids these same variants.
 */
export class Rotator {
  private state: RotationState;

  constructor(initial: RotationState) {
    this.state = { ...initial };
  }

  pick(category: string, pool: string[]): string {
    const { text, index } = pickVariant(pool, category, this.state);
    if (index >= 0) this.state[category] = index;
    return text;
  }

  getState(): RotationState {
    return this.state;
  }
}
