import { pickAnswersForFlow } from "../loadServerOnboardingAnswers";

/**
 * The endpoint returns EVERY record a user has, across flow versions, newest
 * first. Picking the newest one is not good enough: a record written against an
 * older flow holds values this flow no longer offers, and merging it would let
 * those count as progress and skip questions that were never really answered —
 * the same failure the unreadable `opt-…` tokens caused.
 */
describe("pickAnswersForFlow", () => {
  const v2 = {
    flow: { version: "2.0" },
    answers: { "goal.primary": "FEEL_CALMER" },
  };
  const v1 = {
    flow: { version: "1.0" },
    answers: { "speech.severity": "moderate" },
  };

  it("takes the record matching the active flow, not merely the newest", () => {
    // Newest first, exactly as the endpoint orders it.
    expect(pickAnswersForFlow([v1, v2], "2.0")).toEqual(v2.answers);
  });

  it("falls back to the newest when nothing matches the active flow", () => {
    // Better to hand something to `answersAreReadable` and let it decide than
    // to silently treat the account as blank.
    expect(pickAnswersForFlow([v1], "2.0")).toEqual(v1.answers);
  });

  it("returns null for an account with no records", () => {
    expect(pickAnswersForFlow([], "2.0")).toBeNull();
  });

  it("treats an empty answer map as nothing to resume from", () => {
    // A row can exist with no answers on it; that is not progress.
    expect(
      pickAnswersForFlow([{ flow: { version: "2.0" }, answers: {} }], "2.0"),
    ).toBeNull();
  });

  it("copes with an unknown active version", () => {
    expect(pickAnswersForFlow([v2], undefined)).toEqual(v2.answers);
  });
});
