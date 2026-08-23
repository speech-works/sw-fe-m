import { useProgramsDock } from "../programsDock";

/**
 * The shop's dock has one job the screen cannot do for itself: hand the global
 * `CustomTabBar` a mode, and take it back when the shop is gone. Everything
 * here is about that handover, because a dock left in the wrong mode is a
 * screen with somebody else's navigation on it.
 */
const reset = () =>
  useProgramsDock.setState({
    active: false,
    view: "browse",
    ownedCount: 0,
    onMenu: null,
  });

describe("programsDock", () => {
  beforeEach(reset);

  it("lands on Browse every time the shop opens", () => {
    const { enter, setView } = useProgramsDock.getState();
    setView("yours");
    enter(() => {});
    // A shop that reopens on the shelf of things you already own is a shop
    // that has forgotten what it is for.
    expect(useProgramsDock.getState().view).toBe("browse");
    expect(useProgramsDock.getState().active).toBe(true);
  });

  it("releases the dock and drops the exit handler on the way out", () => {
    const { enter, leave } = useProgramsDock.getState();
    enter(() => {});
    leave();
    const s = useProgramsDock.getState();
    expect(s.active).toBe(false);
    // A stale handler would pop a screen that is no longer there.
    expect(s.onMenu).toBeNull();
  });

  it("keeps the owned count across a visit", () => {
    const { enter, leave, setOwnedCount } = useProgramsDock.getState();
    enter(() => {});
    setOwnedCount(3);
    leave();
    // The count is a fact about the account, not about this visit. Clearing it
    // would flash a countless tab on the way back in, before the offers
    // request answers for a second time.
    expect(useProgramsDock.getState().ownedCount).toBe(3);
  });

  it("hands the Menu pill a handler the dock can call", () => {
    const onMenu = jest.fn();
    useProgramsDock.getState().enter(onMenu);
    useProgramsDock.getState().onMenu?.();
    // `goBack` on the tab navigator pops the TAB, not the stack screen inside
    // it, so the screen has to supply this. See the store's header.
    expect(onMenu).toHaveBeenCalledTimes(1);
  });
});
