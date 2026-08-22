import axiosClient from "../axiosClient";

/** The four things a day can move. Mirrors the backend `GrowthAxis`. */
export enum GrowthAxis {
  /** Are you taking on harder things? */
  BRAVER = "BRAVER",
  /** How much of your life is back in play? */
  WIDER = "WIDER",
  /** Do you see things through? */
  STEADIER = "STEADIER",
  /** Are you turning up? Shown apart — a habit, not an improvement. */
  REGULAR = "REGULAR",
}

/**
 * The label the user reads.
 *
 * `STEADIER` is the enum's name and **Finisher** is the word we show, because
 * in a stuttering app "steadier" is read as "my speech is steadier" — a fluency
 * claim we refuse to make. The enum keeps its stored value so no data has to
 * migrate; only the label changed.
 */
/*
 * BRAVER, WIDER AND REGULAR ARE GONE FROM THE UI.
 *
 * They were words this app invented and then had to teach: every place one
 * appeared, a second line appeared under it to say what it meant. Three
 * surfaces carried them. The Today ring was deleted, the practice-completion
 * chip now says "11 hard things done", and the progress report now leads with
 * the plain sentence that used to be the gloss.
 *
 * The enum stays. It is how the SERVER groups these counts, and renaming a
 * stored key to match a copy decision would be a migration for no gain. What
 * changed is that no user is shown the key any more.
 */

export const VISIBLE_AXES: GrowthAxis[] = [
  GrowthAxis.BRAVER,
  GrowthAxis.WIDER,
  GrowthAxis.REGULAR,
];

export const isVisibleAxis = (axis: GrowthAxis | string): boolean =>
  (VISIBLE_AXES as string[]).includes(axis);

export interface DailyPlanItem {
  contentType: string;
  contentId: string;
  title: string;
  growthPointKey: string;
  axes: GrowthAxis[];
  action: string | null;
}

export interface DailyPlan {
  items: DailyPlanItem[];
  /**
   * The loops worth showing today. NEVER render a loop that is absent from
   * here — the server only lists an axis when something in `items` can close
   * it, and an unclosable ring is the exact harm this design avoids.
   */
  loops: GrowthAxis[];
  /** Already earned today, from anywhere in the app — not just these items. */
  closed: GrowthAxis[];
  uncovered: { axis: GrowthAxis; reason: string }[];
}

/**
 * Today's plan. Read by the Home priority card.
 *
 * Returns `null` on any failure rather than throwing. Every caller treats this
 * as an enhancement over a screen that works without it, so a failure means one
 * fewer suggestion, never an error.
 */
export async function fetchDailyPlan(): Promise<DailyPlan | null> {
  try {
    const res = await axiosClient.get("/daily-plan");
    return res.data ?? null;
  } catch (err) {
    console.warn("[dailyPlan] Could not load today's plan", err);
    return null;
  }
}
