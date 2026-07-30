/**
 * These tests exist because the detector's whole value is its SILENCE. If it
 * fires on ordinary taps it is both an analytics bill and a pile of false
 * leads, so the "does not report" cases matter more here than the "does".
 */
import {
  __resetDeadTapStateForTests,
  noteScreen,
  notePress,
  noteUnansweredTap,
} from "../deadTap";

jest.mock("../../analytics/postHog", () => ({ track: jest.fn() }));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { track } = require("../../analytics/postHog");

const tap = (x: number, y: number) =>
  noteUnansweredTap({
    x,
    y,
    screenW: 400,
    screenH: 800,
    durationMs: 90,
    nearTop: false,
    nearEdge: false,
  });

beforeEach(() => {
  __resetDeadTapStateForTests();
  (track as jest.Mock).mockClear();
});

describe("dead-tap detector — silence on ordinary use", () => {
  it("never reports a single unanswered tap", () => {
    expect(tap(200, 400)).toBe(false);
    expect(track).not.toHaveBeenCalled();
  });

  it("never reports taps scattered across the screen", () => {
    // Somebody tapping a text field, then empty space, then elsewhere.
    expect(tap(50, 100)).toBe(false);
    expect(tap(300, 500)).toBe(false);
    expect(tap(120, 700)).toBe(false);
    expect(track).not.toHaveBeenCalled();
  });

  it("stops a cluster the moment a real press lands", () => {
    tap(200, 400);
    notePress(); // the control finally responded
    expect(tap(205, 402)).toBe(false); // must NOT count as a retry
    expect(track).not.toHaveBeenCalled();
  });

  it("does not join taps across a screen change", () => {
    tap(200, 400);
    noteScreen("SomewhereElse");
    expect(tap(202, 401)).toBe(false);
    expect(track).not.toHaveBeenCalled();
  });
});

describe("dead-tap detector — reporting a genuine retry", () => {
  it("reports once the same spot is tapped again", () => {
    expect(tap(200, 400)).toBe(false);
    expect(tap(210, 405)).toBe(true);
    expect(track).toHaveBeenCalledTimes(1);
    expect((track as jest.Mock).mock.calls[0][1]).toMatchObject({ attempts: 2 });
  });

  it("counts escalating attempts", () => {
    tap(200, 400);
    tap(205, 400);
    tap(203, 402);
    const last = (track as jest.Mock).mock.calls.at(-1)?.[1];
    expect(last).toMatchObject({ attempts: 3 });
  });

  it("caps reports per session so one bad session cannot flood", () => {
    for (let i = 0; i < 40; i++) tap(200, 400);
    expect((track as jest.Mock).mock.calls.length).toBeLessThanOrEqual(5);
  });

  it("carries the screen and geometry flags used to test the live theories", () => {
    noteScreen("AvatarStudio");
    noteUnansweredTap({
      x: 8, y: 300, screenW: 400, screenH: 800,
      durationMs: 80, nearTop: false, nearEdge: true,
    });
    noteUnansweredTap({
      x: 10, y: 302, screenW: 400, screenH: 800,
      durationMs: 80, nearTop: false, nearEdge: true,
    });
    // Coordinates are those of the tap that COMPLETED the cluster (the retry),
    // not the first attempt — they are within RETRY_RADIUS_PX of each other by
    // definition, so either is representative.
    expect((track as jest.Mock).mock.calls[0][1]).toMatchObject({
      screen: "AvatarStudio",
      nearEdge: true,
      x: 10,
      xPct: 3, // 10/400 = 2.5% → 3
    });
  });
});
