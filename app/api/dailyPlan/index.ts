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
 * Always rendered with the label — "Wider" alone reads as "did lots of
 * different exercises", which is the wrong meaning.
 *
 * EACH ONE SAYS WHAT ITS NUMBER COUNTS, IN THE FEWEST PLAIN WORDS.
 * They used to be written to avoid making a claim rather than to explain a
 * number, and it showed: "turning up" is an idiom, "how much of your life is
 * back in play" is a metaphor, and neither tells you what the figure beside it
 * is a count OF. Read together they sounded clever and left the user guessing.
 *
 * The test is one read. "Hard things you've done · 11" needs no second pass.
 *
 * This also retired a disclaimer. The card used to carry "None of them are
 * about how smooth you sound" — a definition by negation, which only lands if
 * you already know what we are declining to measure. Three labels that plainly
 * count deeds, situations and days cannot be mistaken for a fluency score, so
 * showing it is better than saying it.
 */
export const AXIS_SUBTITLE: Record<GrowthAxis, string> = {
  [GrowthAxis.BRAVER]: "Hard things you've done",
  [GrowthAxis.WIDER]: "Different situations you've spoken in",
  // Hidden from users (see VISIBLE_AXES) but kept accurate.
  [GrowthAxis.STEADIER]: "Times you saw it through",
  [GrowthAxis.REGULAR]: "Days you've practiced",
};

/**
 * The axes a user is currently shown — THE ONE PLACE THAT DECIDES.
 *
 * Finisher is deliberately absent. It is not a broken axis: "seeing things
 * through" is arguably the most therapeutically meaningful of the four, because
 * escaping a situation is the behaviour the whole treatment targets. It is a
 * SUPPLY problem. Only two of the ten growth points move it — an AI call, which
 * costs real money per use and is capped at one per rolling seven days for free
 * users, and mirror work, of which the catalogue contains exactly one item
 * (`TECH_COGNITIVE_MIRROR_WORK_GENERAL`). Braver responds to four growth points
 * and Regular to six, so shown alongside them Finisher would sit visibly stuck
 * while everything else moved — read by the user as personal failure, when it
 * is really our content shelf. And explaining "this one moves when you take a
 * call" turns the scarcest axis into an advert for the paid feature, which
 * `GrowthPoints.config.ts` forbids in as many words: nothing here may move
 * because something was bought.
 *
 * FILTERING IS A DISPLAY DECISION AND LIVES ONLY HERE. The enum, the registry,
 * `closedToday` and the plan's axis selection all still know about STEADIER,
 * and `/daily-plan/totals` still returns it — so turning it back on is this
 * constant, with no server deploy. Anything that renders an axis to a user must
 * filter through this; anything that reasons about scoring must not.
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

/** One axis's standing total. Counts and dates only — never a score. */
export interface GrowthTotal {
  axis: GrowthAxis;
  /** Attempts, distinct acts or distinct days — the unit differs per axis. */
  count: number;
  /** ISO timestamp of the most recent thing that moved this axis. */
  lastAt: string | null;
}

export interface GrowthTotals {
  axes: GrowthTotal[];
  /** Whether ANYTHING has moved — the "never open on a zero" switch. */
  hasAny: boolean;
}

/**
 * What this person has done, for good.
 *
 * Separate from `fetchDailyPlan` on purpose. That one is about today and resets
 * at midnight; this is the app's memory of somebody and must read the same
 * after a quiet fortnight. Folding them together would invite a screen that
 * renders a lifetime total which appears to reset.
 *
 * Returns `null` on failure, like its sibling — the caller shows nothing rather
 * than an error, because a card the user did not ask for is not worth an alarm.
 */
export async function fetchGrowthTotals(): Promise<GrowthTotals | null> {
  try {
    const res = await axiosClient.get("/daily-plan/totals");
    return res.data ?? null;
  } catch (err) {
    console.warn("[dailyPlan] Could not load growth totals", err);
    return null;
  }
}

/**
 * The totals a user may see, in display order, with their labels resolved.
 *
 * Every rendering path goes through here so no screen can invent its own
 * ordering or accidentally show Finisher. Filtering AFTER the fetch rather than
 * asking the server for three keeps one source of truth about what exists and
 * one about what is shown.
 */
export function visibleTotals(totals: GrowthTotals | null): {
  axis: GrowthAxis;
  label: string;
  subtitle: string;
  count: number;
  lastAt: string | null;
}[] {
  if (!totals) return [];
  const byAxis = new Map(totals.axes.map((t) => [t.axis, t]));
  return VISIBLE_AXES.map((axis) => ({
    axis,
    label: AXIS_LABEL[axis],
    subtitle: AXIS_SUBTITLE[axis],
    count: byAxis.get(axis)?.count ?? 0,
    lastAt: byAxis.get(axis)?.lastAt ?? null,
  }));
}
