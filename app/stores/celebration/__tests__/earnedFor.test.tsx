import React from "react";

import { useCelebrationStore } from "..";

// `require`, not `import`: react-test-renderer ships no types and this repo has
// no @types for it, so an import fails `tsc -p tsconfig.check.json`.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const TestRenderer = require("react-test-renderer");

// The celebration store pulls in the user store, which reaches
// react-native-purchases — untranspiled ESM that Jest cannot load. Only
// `capture` touches it, and these tests do not, so cut the chain here.
// (Hoisted above the imports by babel-plugin-jest-hoist.)
jest.mock("../../user", () => ({
  useUserStore: { getState: () => ({ user: null }) },
}));

/**
 * REGRESSION: the success screen used to crash to the root error boundary
 * ("Something went wrong") on completions that moved no growth axis.
 *
 * `earnedFor` is read through a zustand selector in DonePractice. zustand v5
 * hands the selector straight to React's `useSyncExternalStore`, which compares
 * snapshots with `Object.is` — so returning a fresh `[]` on the miss path made
 * every snapshot unequal to the last, force-re-rendering forever until React
 * threw "Maximum update depth exceeded" from the render phase.
 *
 * The hit path never showed it (`earned.axes` is the one array the response was
 * stored with), which is why it read as intermittent: it fired only when the
 * server reported no `axesMoved`, when the id didn't match, or when the caller
 * passed no activity id at all (Mirror Work).
 *
 * These tests render the store through a real selector rather than calling
 * `earnedFor` directly, because a direct call cannot observe the bug.
 */
describe("celebration store — earnedFor identity", () => {
  beforeEach(() => {
    useCelebrationStore.getState().clear();
  });

  /** Renders the selector and reports how many times React rendered. */
  function renderSelector(activityId?: string) {
    let renders = 0;
    let last: readonly string[] | null = null;
    const Probe = () => {
      renders++;
      // A runaway loop would otherwise be reported as React's own error; fail
      // loudly and early instead so the assertion below is readable.
      if (renders > 100) throw new Error("RENDER_LOOP");
      last = useCelebrationStore((s) => s.earnedFor(activityId));
      return null;
    };
    let tree: any;
    TestRenderer.act(() => {
      tree = TestRenderer.create(<Probe />);
    });
    // Unmount before returning — a probe left subscribed makes the next test's
    // `clear()` an unwrapped update, which React reports as an act() warning.
    TestRenderer.act(() => {
      tree.unmount();
    });
    return { renders, value: last as readonly string[] | null };
  }

  it("does not re-render forever when the completion moved no axis", () => {
    // Nothing recorded — the miss path.
    const { renders, value } = renderSelector("activity-1");
    expect(renders).toBe(1);
    expect(value).toEqual([]);
  });

  it("does not re-render forever when the recorded axes belong to another activity", () => {
    useCelebrationStore.getState().recordEarned("other-activity", ["BRAVER"]);
    const { renders, value } = renderSelector("activity-1");
    expect(renders).toBe(1);
    expect(value).toEqual([]);
  });

  it("does not re-render forever when the caller has no activity id (Mirror Work)", () => {
    useCelebrationStore.getState().recordEarned("activity-1", ["BRAVER"]);
    const { renders, value } = renderSelector(undefined);
    expect(renders).toBe(1);
    expect(value).toEqual([]);
  });

  it("still returns the recorded axes on the hit path, stably", () => {
    useCelebrationStore.getState().recordEarned("activity-1", ["BRAVER"]);
    const { renders, value } = renderSelector("activity-1");
    expect(renders).toBe(1);
    expect(value).toEqual(["BRAVER"]);
  });

  it("returns the SAME empty array instance every time — the actual fix", () => {
    const { earnedFor } = useCelebrationStore.getState();
    expect(earnedFor("a")).toBe(earnedFor("b"));
    expect(earnedFor(undefined)).toBe(earnedFor("a"));
  });
});
