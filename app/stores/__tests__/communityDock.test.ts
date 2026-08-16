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
      requestsOpen: false,
    });
  });

  const s = () => useCommunityDock.getState();

  it("opens requests and drops the Us/Timeline morph on the way in", () => {
    s().setMode("tabs");
    s().openRequests();
    expect(s().requestsOpen).toBe(true);
    // Two modes at once would leave the bar rendering the switcher over a list.
    expect(s().mode).toBe("nav");
  });

  it("does not require pairing", () => {
    // `enabled` is the paired-only Us/Timeline gate. Requests are mostly an
    // UNPAIRED concern, so they must not inherit it.
    expect(s().enabled).toBe(false);
    s().openRequests();
    expect(s().requestsOpen).toBe(true);
  });

  it("closes on leave, so the mode cannot outlive the visit", () => {
    s().enter();
    s().openRequests();
    s().leave();
    expect(s().requestsOpen).toBe(false);
    // Coming back must land on the ordinary screen, not the list you left open.
    s().enter();
    expect(s().requestsOpen).toBe(false);
  });

  it("keeps `enabled` across a leave, unlike requestsOpen", () => {
    // Regression guard for the existing rule: `enabled` tracks pairing, not
    // focus, and resetting it on blur used to break the morph on return.
    s().setEnabled(true);
    s().enter();
    s().openRequests();
    s().leave();
    expect(s().enabled).toBe(true);
    expect(s().requestsOpen).toBe(false);
  });

  it("closeRequests leaves everything else alone", () => {
    s().setEnabled(true);
    s().enter();
    s().setView("timeline");
    s().openRequests();
    s().closeRequests();
    expect(s().requestsOpen).toBe(false);
    expect(s().view).toBe("timeline");
    expect(s().active).toBe(true);
  });
});
