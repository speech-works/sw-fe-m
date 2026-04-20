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

const formatPrimaryValue = (
  value: number,
  kind: BenchmarkKind,
  compact: boolean,
) => {
  const formatted = formatCount(value);

  switch (kind) {
    case "minutes":
      return compact ? `${formatted}m` : `${formatted} min`;
    case "sessions":
      return compact
        ? value === 1
          ? "1 more"
          : `${formatted} more`
        : value === 1
          ? "1 more"
          : `${formatted} more`;
    case "days":
      return compact
        ? value === 1
          ? "1 more day"
          : `${formatted} more days`
        : value === 1
          ? "1 more day"
          : `${formatted} more days`;
    default:
      return formatted;
  }
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

  return {
    primary: `${formatPrimaryValue(
      comparison.remainingToMatch ?? 0,
      kind,
      compact,
    )} to match${compact ? "" : " last week"}`,
    secondary:
      comparison.percentOfPreviousTotal !== null
        ? compact
          ? `${Math.round(comparison.percentOfPreviousTotal)}%`
          : `${Math.round(comparison.percentOfPreviousTotal)}% of last week's total`
        : null,
    isAhead: false,
  };
};
