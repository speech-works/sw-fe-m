export type FlowBenchmarkLike = {
  current: number;
  previousTotal: number;
  hasBenchmark: boolean;
  absoluteDelta: number | null;
  percentOfPreviousTotal: number | null;
  remainingToMatch: number | null;
  aheadOfPrevious: number | null;
  status: "NO_BASELINE" | "BEHIND" | "MATCHED" | "AHEAD";
  comparisonLabel: string;
};

type BenchmarkKind = "minutes" | "sessions" | "days";

type BenchmarkCopyOptions = {
  compact?: boolean;
};

const formatCount = (value: number) => {
  if (Number.isInteger(value)) {
    return `${value}`;
  }

  return value.toFixed(1);
};

const formatAheadValue = (
  value: number,
  kind: BenchmarkKind,
  compact: boolean,
) => {
  const formatted = formatCount(value);

  switch (kind) {
    case "minutes":
      return compact ? `${formatted}m ahead` : `${formatted} min ahead of last week`;
    case "sessions":
      return value === 1
        ? compact
          ? "1 ahead"
          : "1 ahead of last week"
        : compact
          ? `${formatted} ahead`
          : `${formatted} ahead of last week`;
    case "days":
      return value === 1
        ? compact
          ? "1 day ahead"
          : "1 day ahead of last week"
        : compact
          ? `${formatted} days ahead`
          : `${formatted} days ahead of last week`;
    default:
      return formatted;
  }
};

export const getFlowBenchmarkCopy = (
  comparison: FlowBenchmarkLike | null | undefined,
  kind: BenchmarkKind,
  { compact = false }: BenchmarkCopyOptions = {},
) => {
  if (!comparison || !comparison.hasBenchmark) {
    return {
      primary: compact ? "No last-week benchmark" : "No last-week benchmark yet",
      secondary: null as string | null,
      isAhead: false,
    };
  }

  if (comparison.status === "MATCHED") {
    return {
      primary: "Matched last week",
      secondary:
        comparison.percentOfPreviousTotal !== null
          ? compact
            ? `${Math.round(comparison.percentOfPreviousTotal)}%`
            : `${Math.round(comparison.percentOfPreviousTotal)}% of last week's total`
          : null,
      isAhead: false,
    };
  }

  if (comparison.status === "AHEAD") {
    return {
      primary: formatAheadValue(comparison.aheadOfPrevious ?? 0, kind, compact),
      secondary:
        comparison.percentOfPreviousTotal !== null
          ? compact
            ? `${Math.round(comparison.percentOfPreviousTotal)}%`
            : `${Math.round(comparison.percentOfPreviousTotal)}% of last week's total`
          : null,
      isAhead: true,
    };
  }

  // BEHIND — AND WE SAY NOTHING.
  //
  // This branch used to return "12 min to match last week" plus "38% of last
  // week's total". Both numbers are true and neither is useful: the raw figure
  // this week is already on screen beside it, so the only thing the sentence
  // added was the shortfall — a quantified statement of how far someone fell
  // short, delivered to people who are unusually practised at reading those
  // about themselves.
  //
  // AHEAD and MATCHED are kept, and the asymmetry is the point rather than an
  // oversight. It is the same rule the Us page already states for buddies —
  // "vs your own pace, celebrated, never penalised" — finally applied to
  // somebody's own report of themselves. There is no replacement copy, because
  // a softened deficit ("nearly there!") is still a deficit with a smile on it.
  //
  // `primary` is null rather than "" so a caller cannot render an empty line
  // where a sentence used to be, and the type makes them handle it.
  return {
    primary: null as string | null,
    secondary: null as string | null,
    isAhead: false,
  };
};
