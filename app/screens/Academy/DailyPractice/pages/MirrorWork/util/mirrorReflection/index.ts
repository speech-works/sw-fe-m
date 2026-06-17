import { FaceRegion, SIGNAL_REGION, MirrorBehaviorSignal } from "../../types";
import {
  ReflectionInput,
  ReflectionView,
  RenderedInsight,
  RotationState,
} from "./types";
import { cueBand, regionBand, CUE_BAND_PHRASE } from "./countBands";
import { selectInsights, InsightCandidate } from "./insightSelection";
import { Rotator } from "./rotation";
import {
  MOOD_LABELS,
  MoodKey,
  REGION_TIER,
  OPENING_FIRST,
  OPENING_RETURNING,
  PROGRESS_IMPROVED,
  PROGRESS_STEADY,
  PROGRESS_TENSER,
  MILESTONE_CALMEST,
  MILESTONE_LONGEST,
  ARC_EASED,
  ARC_TENSED,
  ARC_MIXED,
  CALM,
  ENCOURAGEMENT,
  CAVEAT,
  REGION_OBSERVATION,
} from "./phraseBanks";

export * from "./types";
export { selectInsights } from "./insightSelection";
export { cueBand, regionBand } from "./countBands";
// Note: rotation PERSISTENCE (loadRotationState/saveRotationState) lives in
// ./rotationStorage and is imported directly by the screen — it pulls AsyncStorage,
// so it's deliberately NOT re-exported here, keeping buildReflection's graph pure.

/** Total onset count across the signals that belong to a region. */
function regionOnsetCount(
  region: FaceRegion,
  signalCounts: ReflectionInput["signalCounts"],
): number {
  let total = 0;
  (Object.keys(signalCounts) as MirrorBehaviorSignal[]).forEach((sig) => {
    if (SIGNAL_REGION[sig] === region) total += signalCounts[sig]?.eventCount ?? 0;
  });
  return total;
}

/** Frequency phrase for a region's observation (falls back to "at times"). */
function regionFreqPhrase(region: FaceRegion, input: ReflectionInput): string {
  const band = cueBand(regionOnsetCount(region, input.signalCounts));
  return band ? CUE_BAND_PHRASE[band] : "at times";
}

/** Worst (lowest) region ease this session, or null if no regions reported. */
function worstRegionEase(regionEase: ReflectionInput["regionEase"]): number | null {
  const vals = Object.values(regionEase).filter((v): v is number => v !== undefined);
  return vals.length ? Math.min(...vals) : null;
}

function computeMoodKey(input: ReflectionInput): MoodKey {
  if (input.comparison?.flags.isFirstSession) return "firstSession";

  const worst = worstRegionEase(input.regionEase);
  if (worst === null) return "calm";
  const band = regionBand(worst);

  // A clear "eased over the session" story is worth celebrating, unless the
  // session was genuinely heavy (heldTension) — then name the tension honestly.
  if (input.withinSession?.arc === "eased" && band !== "heldTension") return "eased";

  if (band === "relaxed") return "calm";
  if (band === "mostlyEased") return "mostlyAtEase";
  if (band === "someTension") return "someToNotice";
  return "heldTension";
}

function renderInsight(
  cand: InsightCandidate,
  input: ReflectionInput,
  rot: Rotator,
): RenderedInsight {
  switch (cand.kind) {
    case "milestone": {
      const pool = cand.milestoneKey === "calmest" ? MILESTONE_CALMEST : MILESTONE_LONGEST;
      return { kind: "milestone", tier: "A", text: rot.pick(`milestone:${cand.milestoneKey}`, pool) };
    }
    case "progress": {
      const pool =
        cand.progressKey === "improved" ? PROGRESS_IMPROVED
        : cand.progressKey === "tenser" ? PROGRESS_TENSER
        : PROGRESS_STEADY;
      return { kind: "progress", tier: "A", text: rot.pick(`progress:${cand.progressKey}`, pool) };
    }
    case "opening": {
      const pool = cand.openingKey === "first" ? OPENING_FIRST : OPENING_RETURNING;
      return { kind: "opening", tier: "A", text: rot.pick(`opening:${cand.openingKey}`, pool) };
    }
    case "arc": {
      const pool =
        cand.arcKey === "eased" ? ARC_EASED : cand.arcKey === "tensed" ? ARC_TENSED : ARC_MIXED;
      return { kind: "arc", tier: "A", text: rot.pick(`arc:${cand.arcKey}`, pool) };
    }
    case "regionObservation": {
      const region = cand.region!;
      const band = cand.band!;
      const pool = REGION_OBSERVATION[region][band];
      const raw = rot.pick(`region:${region}:${band}`, pool);
      const text = raw.replace("{freq}", regionFreqPhrase(region, input));
      return { kind: "regionObservation", tier: REGION_TIER[region], region, text };
    }
    case "calm":
    default:
      return { kind: "calm", tier: "A", text: rot.pick("calm", CALM) };
  }
}

/**
 * Build the full reflection view from this session's data + cross-session
 * comparison, drawing varied wording from the rotation state. Returns the view
 * plus the updated rotation state to persist (so the next session avoids these
 * same variants). Variety comes from three independent axes: the data, which
 * insights are salient, and the no-repeat-last wording rotation.
 */
export function buildReflection(
  input: ReflectionInput,
  rotationIn: RotationState,
): { view: ReflectionView; rotation: RotationState } {
  const rot = new Rotator(rotationIn);

  // Defensive: a malformed comparison (missing flags / vsLast.overall) is treated
  // as "no comparison" so a bad backend payload can never throw mid-render.
  const c = input.comparison;
  const comparisonOk = !!(c && c.flags && c.vsLast && c.vsLast.overall);
  const safeInput: ReflectionInput = comparisonOk ? input : { ...input, comparison: null };

  const moodKey = computeMoodKey(safeInput);
  const moodLabel = rot.pick(`mood:${moodKey}`, MOOD_LABELS[moodKey]);
  const tone =
    moodKey === "someToNotice" ? "some" : moodKey === "heldTension" ? "more" : "calm";

  const insights = selectInsights(safeInput).map((cand) => renderInsight(cand, safeInput, rot));

  const encouragement = rot.pick("encouragement", ENCOURAGEMENT);
  const caveat = rot.pick("caveat", CAVEAT);

  return {
    view: { moodLabel, tone, insights, encouragement, caveat },
    rotation: rot.getState(),
  };
}
