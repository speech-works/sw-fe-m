import { FaceRegion } from "../../types";
import { InsightKind, ReflectionInput, Tier } from "./types";
import { regionBand, isNotableBand } from "./countBands";
import { REGION_TIER } from "./phraseBanks";

export const MAX_INSIGHTS = 4;

const TIER_SCORE_PENALTY: Record<Tier, number> = { A: 0, B: 5, C: 10 };

// |ease delta| (points) vs last session that counts as a "strong" change.
const STRONG_DELTA = 8;

export interface InsightCandidate {
  kind: InsightKind;
  score: number;
  region?: FaceRegion;
  band?: "someTension" | "heldTension";
  progressKey?: "improved" | "steady" | "tenser";
  openingKey?: "first" | "returning";
  milestoneKey?: "calmest" | "longest";
  arcKey?: "eased" | "tensed" | "mixed";
}

/**
 * Pick and order the 1–4 most salient insights for this session.
 * Guarantees: exactly one framing line (progress when we have history, else an
 * opening); at most two region observations (worst ease first); a milestone
 * leads when present; never empty (calm fallback). Ordering is deterministic.
 */
export function selectInsights(input: ReflectionInput): InsightCandidate[] {
  const { regionEase, withinSession, comparison } = input;

  // ── Milestone (at most one; calmest beats longest) ──
  let milestone: InsightCandidate | null = null;
  if (comparison?.flags.isCalmestRecent) {
    milestone = { kind: "milestone", score: 100, milestoneKey: "calmest" };
  } else if (comparison?.flags.isLongestRecent) {
    milestone = { kind: "milestone", score: 95, milestoneKey: "longest" };
  }

  // ── Framing line: progress (with history) OR opening ──
  let framing: InsightCandidate;
  if (comparison?.hasComparison) {
    const d = comparison.vsLast.overall;
    const strong = d.absoluteDelta !== null && Math.abs(d.absoluteDelta) >= STRONG_DELTA;
    const progressKey =
      d.trend === "IMPROVING" ? "improved" : d.trend === "WORSENING" ? "tenser" : "steady";
    framing = { kind: "progress", score: strong ? 90 : 62, progressKey };
  } else {
    const openingKey = comparison?.flags.isFirstSession ? "first" : "returning";
    framing = { kind: "opening", score: 85, openingKey };
  }

  // ── Region observations (notable bands only; worst ease first; cap 2) ──
  const regionRanked: { cand: InsightCandidate; ease: number }[] = [];
  (Object.keys(regionEase) as FaceRegion[]).forEach((region) => {
    const ease = regionEase[region];
    if (ease === undefined) return;
    const band = regionBand(ease);
    if (!isNotableBand(band)) return;
    const tier = REGION_TIER[region];
    const base = band === "heldTension" ? 80 : 70;
    regionRanked.push({
      cand: { kind: "regionObservation", score: base - TIER_SCORE_PENALTY[tier], region, band },
      ease,
    });
  });
  regionRanked.sort((a, b) => a.ease - b.ease); // lowest ease = most tension first
  const topRegions = regionRanked.slice(0, 2).map((r) => r.cand);

  // ── Arc (skip steady / insufficient — nothing worth saying) ──
  let arc: InsightCandidate | null = null;
  if (withinSession?.arc === "eased") arc = { kind: "arc", score: 72, arcKey: "eased" };
  else if (withinSession?.arc === "tensed") arc = { kind: "arc", score: 60, arcKey: "tensed" };
  else if (withinSession?.arc === "mixed") arc = { kind: "arc", score: 45, arcKey: "mixed" };

  // ── Calm fallback only when there's genuinely nothing else ──
  const hasContent = milestone || topRegions.length > 0 || arc;
  const calm: InsightCandidate | null = hasContent ? null : { kind: "calm", score: 30 };

  // ── Assemble display order ──
  const ordered: InsightCandidate[] = [];
  if (milestone) ordered.push(milestone);
  ordered.push(framing);
  const rest = [...topRegions, ...(arc ? [arc] : [])].sort((a, b) => b.score - a.score);
  for (const r of rest) {
    if (ordered.length >= MAX_INSIGHTS) break;
    ordered.push(r);
  }
  if (calm && ordered.length < MAX_INSIGHTS) ordered.push(calm);

  return ordered;
}
