import {
  OverallStateHistoryBucket,
  UserOverallStateAggregate,
  ProfileFamily,
  GrowthProfileAxisKey,
} from "../../api/overallState/types";
import { GrowthProfileMetrics } from "../../api/userBehaviorTrends/types";

export type FamilyMetricData = {
  currentScore: number | null;
  previousScore: number | null;
  percentDelta: number | null;
  absoluteDelta: number | null;
  trend: "IMPROVING" | "STABLE" | "WORSENING";
};

/**
 * Derive one family's metric (current score + week-over-week deltas) for a
 * single domain axis, straight from a live snapshot. Shared by the Home
 * widget's chips AND the Dimension detail screen so the number they show can
 * never drift: the detail screen re-derives from the SAME live `overallState`
 * the trend line reads, which keeps the hero "This week" number and the
 * trend's "Now" point pinned to one value.
 */
export const buildFamilyMetric = (
  overallState: UserOverallStateAggregate,
  family: ProfileFamily,
  profileKey: GrowthProfileAxisKey,
): FamilyMetricData => {
  const familyAxes = overallState.profile.axes[family];
  const familyDelta =
    overallState.profile.comparison.deltas[family][profileKey];
  return {
    currentScore: familyAxes[profileKey],
    previousScore: familyDelta.previous,
    percentDelta: familyDelta.percentDelta,
    absoluteDelta: familyDelta.absoluteDelta,
    trend: familyDelta.trend,
  };
};

/** Overall growth = mean of the 5 combined axes (the same "Profile score" the
 *  Progress Report's WeeklyGrowthCard computes). */
export const overallOf = (axes: GrowthProfileMetrics): number =>
  Math.round(
    (axes.confidence + axes.courage + axes.mastery + axes.ease + axes.social) /
      5,
  );

export type TrendWeek = {
  key: string;
  label: string;
  value: number | null; // null = no data that week → line breaks / hollow
  isCurrent: boolean;
};

/**
 * Normalizes the store's history into exactly 4 weekly points, oldest → newest,
 * always ending at the live current week ("Now"). Sorts on `periodKey` (a stable
 * ISO-week string) rather than `periodStart`, which the backend does not reliably
 * send. `getValue` pulls the number to plot from a snapshot (overall, or one
 * family+metric); a missing snapshot/value yields `null`.
 */
export const buildTrendWeeks = (
  historyBuckets: OverallStateHistoryBucket[],
  overallState: UserOverallStateAggregate | null,
  getValue: (aggregate: UserOverallStateAggregate) => number | null,
): TrendWeek[] => {
  const currentPeriodKey = overallState?.periodKey ?? null;

  const pastBuckets = [...historyBuckets]
    .sort((a, b) => String(a.periodKey).localeCompare(String(b.periodKey)))
    .filter((bucket) => bucket.periodKey !== currentPeriodKey)
    .slice(-3);

  const past: TrendWeek[] = pastBuckets.map((bucket) => ({
    key: bucket.periodKey,
    label: "",
    value:
      bucket.hasData && bucket.snapshot ? getValue(bucket.snapshot) : null,
    isCurrent: false,
  }));

  // Pad to exactly 3 past weeks so the chart never collapses pre-history.
  while (past.length < 3) {
    past.unshift({
      key: `empty-${past.length}`,
      label: "",
      value: null,
      isCurrent: false,
    });
  }

  const weeks: TrendWeek[] = [
    ...past,
    {
      key: currentPeriodKey ?? "now",
      label: "Now",
      value: overallState ? getValue(overallState) : null,
      isCurrent: true,
    },
  ];

  // Label the past weeks 3w / 2w / 1w (newest past = 1w); current stays "Now".
  return weeks.map((week, index) =>
    week.isCurrent
      ? week
      : { ...week, label: `${weeks.length - 1 - index}w` },
  );
};
