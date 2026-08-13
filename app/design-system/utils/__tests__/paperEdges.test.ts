import { execSync } from "child_process";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * ============================================================================
 * EVERY FILLED ACCENT SURFACE EITHER CARRIES A PAPER EDGE OR IS LISTED HERE
 * ----------------------------------------------------------------------------
 * `accentEdge` and friends are opt-in per call site, and the app has ~60 places
 * that fill something with a bright hue across 150 screens. Opt-in plus that
 * many sites is a guarantee of drift: the SAME component ends up edged on one
 * screen and not on the next, which is precisely how this was found — the
 * full-bleed practice card had an edge on Explore and none on the seven other
 * screens that render the identical idiom.
 *
 * So the rule is enforced instead of remembered. Any `backgroundColor:
 * colors.accent…/action.primary/category…` in a screen or component must be in
 * a file that also imports an edge helper, or be named below with a reason.
 *
 * This does NOT prove each site is edged correctly — a file can import the
 * helper and forget one line. It proves the tail is visible, which is the thing
 * a grep-by-hand pass cannot promise.
 * ============================================================================
 */

/** Sites that are deliberately NOT edged. Every entry needs a reason. */
const ALLOWED: Record<string, string> = {
  // On a coloured ground, where the fill already has a boundary.
  "app/screens/Academy/DailyPractice/components/DonePractice/LevelUpTakeover.tsx":
    "full-screen celebration takeover paints its own dark ground under the disc",
  "app/components/stage/CallerStage.tsx": "call stage is dark by design (ForceDark)",
  "app/screens/FirstCall/RingingScreen.tsx": "incoming-call screen is dark by design",

  // Decorative, not an object with a shape to bound.
  "app/screens/Payments/index.tsx":
    "the two accent fills are background blobs at opacity 0.1 — an edge would draw the blob",
  "app/screens/Academy/DailyPractice/pages/CognitivePractice/Breathing/components/BreathingHalo.tsx":
    "animated breathing halo; an outline would read as a ring the exercise does not have",
  "app/screens/Onboarding/OnboardingCelebration.tsx":
    "confetti/celebration bubbles over a celebration ground, not objects on the page",

  // Already bounded by something else.
  "app/screens/Home/components/IdentityBlock/index.tsx":
    "the unread dot carries a surface.elevated ring, which is its boundary",
};

const SCAN_ROOTS = ["app/screens", "app/components"];
const FILL = String.raw`backgroundColor:\s*colors\.(accent\[|accent\.|action\.primary\b|category\[|category\.)`;
const EDGE = /accentEdge|primaryEdge|categoryEdge|discEdge|computedFillEdge/;

const repoRoot = join(__dirname, "..", "..", "..", "..");

const filesWithFills = (): string[] => {
  let out = "";
  try {
    out = execSync(`grep -rlE '${FILL}' ${SCAN_ROOTS.join(" ")} --include='*.tsx'`, {
      cwd: repoRoot,
      encoding: "utf8",
    });
  } catch {
    // grep exits 1 when nothing matches, which is a pass, not an error.
    return [];
  }
  return out.split("\n").filter(Boolean).sort();
};

describe("paper edges on filled accent surfaces", () => {
  it("every file that fills with a bright hue imports an edge helper, or is allow-listed", () => {
    const unguarded = filesWithFills().filter(
      (f) => !ALLOWED[f] && !EDGE.test(readFileSync(join(repoRoot, f), "utf8")),
    );
    expect(unguarded).toEqual([]);
  });

  it("the allow-list has no stale entries", () => {
    const withFills = new Set(filesWithFills());
    const stale = Object.keys(ALLOWED).filter((f) => !withFills.has(f));
    expect(stale).toEqual([]);
  });
});
