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
export const AXIS_LABEL: Record<GrowthAxis, string> = {
  [GrowthAxis.BRAVER]: "Braver",
  [GrowthAxis.WIDER]: "Wider",
  [GrowthAxis.STEADIER]: "Finisher",
  [GrowthAxis.REGULAR]: "Regular",
};

/**
 * Always rendered with the label. "Wider" alone reads as "did lots of different
 * exercises", which is the wrong meaning — the subtitle is what makes it mean a
 * life rather than a menu, so the two must not be separated.
 */
export const AXIS_SUBTITLE: Record<GrowthAxis, string> = {
  [GrowthAxis.BRAVER]: "taking on harder things",
  [GrowthAxis.WIDER]: "how much of your life is back in play",
  [GrowthAxis.STEADIER]: "seeing things through",
  [GrowthAxis.REGULAR]: "turning up",
};

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
 * Today's suggestions and the loops we can honestly promise.
 *
 * Returns `null` on any failure rather than throwing. The strip is an
 * enhancement above a practice hub that has always worked on its own — if this
 * call fails the hub must still be perfectly usable, so there is nothing here
 * worth showing an error for.
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
