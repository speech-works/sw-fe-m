import { CueBand, RegionBand } from "./types";

/**
 * Map a raw onset count to a qualitative frequency band. Returns null for 0.
 * Deliberately coarse so small detector noise (a 2 vs a 3) doesn't flip the
 * word the user reads — and so raw integers never reach the screen.
 */
export function cueBand(count: number): CueBand | null {
  if (count <= 0) return null;
  if (count <= 2) return "onceOrTwice";
  if (count <= 5) return "aFew";
  return "several";
}

/** Map a region ease score (0..100) to a qualitative tension band. */
export function regionBand(ease: number): RegionBand {
  if (ease >= 90) return "relaxed";
  if (ease >= 75) return "mostlyEased";
  if (ease >= 55) return "someTension";
  return "heldTension";
}

/** Human phrasing for each frequency band (slotted into region observations). */
export const CUE_BAND_PHRASE: Record<CueBand, string> = {
  onceOrTwice: "once or twice",
  aFew: "a few times",
  several: "several times",
};

/** A region with one of these bands is worth surfacing as an observation. */
export function isNotableBand(
  band: RegionBand,
): band is "someTension" | "heldTension" {
  return band === "someTension" || band === "heldTension";
}
