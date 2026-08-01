import { pickAuthEntryRoute } from "../authEntryRoute";

/**
 * The single line that decides what a logged-out person sees on open — and the
 * one that shipped a login wall to the people Act 1 was built for.
 *
 * `initialRouteName` is read ONCE, at mount, so a wrong answer here is not
 * self-healing: the navigator does not re-pick when the store settles. That is
 * why the hydration gate in AuthNavigator exists, and why this is worth pinning
 * rather than eyeballing.
 */
describe("pickAuthEntryRoute", () => {
  it("opens a stranger on the welcome screen", () => {
    expect(
      pickAuthEntryRoute({ preAuthEnabled: true, draftCompleted: null }),
    ).toBe("ActOneWelcome");
  });

  it("gives someone who finished Act 1 their result, not the login wall", () => {
    // THE REGRESSION. `completedAt` is set at the last question and cleared
    // only after a successful post-signup replay, so this is exactly the person
    // who answered everything and closed the app before making an account.
    // Sending them to "Auth" handed them the wall Act 1 exists to remove, with
    // no route back to what their answers earned.
    expect(
      pickAuthEntryRoute({
        preAuthEnabled: true,
        draftCompleted: "2026-08-02T09:00:00.000Z",
      }),
    ).toBe("ActOneTeaser");
  });

  it("falls all the way back to login when the flag is off", () => {
    // The flag is a runtime read, so both paths ship and this one has to keep
    // working — turning Act 1 off must restore the old login-first app rather
    // than strand people on a half-disabled flow.
    expect(
      pickAuthEntryRoute({ preAuthEnabled: false, draftCompleted: null }),
    ).toBe("Auth");
  });

  it("keeps the flag ahead of a completed draft", () => {
    // Off means off: a draft left over from a build where Act 1 was enabled
    // must not reopen any part of it.
    expect(
      pickAuthEntryRoute({
        preAuthEnabled: false,
        draftCompleted: "2026-08-02T09:00:00.000Z",
      }),
    ).toBe("Auth");
  });
});
