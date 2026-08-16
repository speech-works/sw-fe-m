import { useCommunityDock } from "../communityDock";

/**
 * The dock has three things it can be, and only one of them at a time.
 *
 * These are lifecycle tests rather than rendering ones: the whole point of
 * `requestsOpen` living in a store is that the bottom bar (a global component,
 * mounted outside Community) and the screen agree about which mode they are in.
 * The failure this guards against is a dock left pointing at a screen you are
 * no longer on, which is invisible in a unit test of either half alone.
 */
describe("communityDock", () => {
  beforeEach(() => {
    useCommunityDock.setState({
      active: false,
      enabled: false,
      mode: "nav",
      view: "us",
      people: null,
    });
  });

  const s = () => useCommunityDock.getState();

  it("opens the People page and drops the Us/Timeline morph on the way in", () => {
    s().setMode("tabs");
    s().openPeople("waiting");
    expect(s().people).toBe("waiting");
    // Two switchers at once would leave the bar rendering one over the other.
    expect(s().mode).toBe("nav");
  });

  it("opens at whichever half was asked for", () => {
    s().openPeople("discover");
    expect(s().people).toBe("discover");
  });

  it("switches halves without leaving the page or touching the dock mode", () => {
    s().openPeople("waiting");
    s().setMode("tabs");
    s().setPeople("discover");
    expect(s().people).toBe("discover");
    // The dock is mid-handover; changing segment must not throw it back to nav.
    expect(s().mode).toBe("tabs");
  });

  it("does not require pairing", () => {
    // `enabled` is the paired-only Us/Timeline gate. This page is mostly an
    // UNPAIRED concern, so it must not inherit it.
    expect(s().enabled).toBe(false);
    s().openPeople("waiting");
    expect(s().people).toBe("waiting");
  });

  it("closes on leave, so the page cannot outlive the visit", () => {
    s().enter();
    s().openPeople("waiting");
    s().leave();
    expect(s().people).toBeNull();
    // Coming back must land on the ordinary screen, not the page you left open.
    s().enter();
    expect(s().people).toBeNull();
  });

  it("keeps `enabled` across a leave, unlike `people`", () => {
    // Regression guard for the existing rule: `enabled` tracks pairing, not
    // focus, and resetting it on blur used to break the morph on return.
    s().setEnabled(true);
    s().enter();
    s().openPeople("discover");
    s().leave();
    expect(s().enabled).toBe(true);
    expect(s().people).toBeNull();
  });

    it("closePeople returns the dock to nav and leaves everything else alone", () => {
    s().setEnabled(true);
    s().enter();
    s().setView("timeline");
    s().openPeople("waiting");
    s().setMode("tabs");
    s().closePeople();
    expect(s().people).toBeNull();
    // The tabs it was showing belong to a page that is gone.
    expect(s().mode).toBe("nav");
    expect(s().view).toBe("timeline");
    expect(s().active).toBe(true);
  });
});
