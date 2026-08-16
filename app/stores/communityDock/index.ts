import { create } from "zustand";

export type DockMode = "nav" | "tabs";
export type CommunityView = "us" | "timeline";
/** Which half of the People page is showing. */
export type PeopleTab = "waiting" | "discover";

/**
 * Drives the morphing bottom dock for Community. The single global `CustomTabBar`
 * reads this: while Community is focused and `mode === "tabs"` it renders the
 * Us/Timeline switcher instead of the global nav, so there is only ever ONE dock.
 * Community owns the writes (focus/blur, scroll cue, the inline switcher, swipe).
 */
interface CommunityDockState {
  /** Community is focused and owns the dock right now. */
  active: boolean;
  /** The Us/Timeline morph is available (i.e. Community is paired). */
  enabled: boolean;
  /** `nav` = global menu dock · `tabs` = Us/Timeline switcher. */
  mode: DockMode;
  /** Which Community page is showing (source of truth for the pager). */
  view: CommunityView;
  /**
   * The People page has taken over the Community screen, and which half of it
   * is showing. `null` means we are not on it.
   *
   * ONE AXIS FOR BOTH HALVES, because they are one page. This replaced a
   * boolean `requestsOpen`: requests and discovery used to be two screens with
   * two entry points and two docks, and they are the same list of the same kind
   * of person, so they are now two segments of one thing.
   *
   * Deliberately NOT a value of `mode`, and deliberately NOT gated on
   * `enabled`. `mode` is the nav/tabs axis and is shared with the paired
   * Us/Timeline switcher; `enabled` means paired, and this page exists mostly
   * for people who have no buddy yet. Keeping them separate means neither can
   * accidentally disable the other.
   *
   * It is a MODE OF THE SCREEN, not a toggle of its own: `enter`/`leave` clear
   * it, so it can never outlive the visit that opened it. That is what makes
   * the system back gesture put the nav dock back with no extra wiring.
   */
  people: PeopleTab | null;
  /** On Community focus — always land on Us, in nav mode. */
  enter: () => void;
  /** On Community blur — release the dock back to global nav. */
  leave: () => void;
  setEnabled: (enabled: boolean) => void;
  setMode: (mode: DockMode) => void;
  setView: (view: CommunityView) => void;
  /** Open the People page at a given half. Drops the dock back to nav on the
   *  way in, so it is never asked to be two switchers at once. */
  openPeople: (tab: PeopleTab) => void;
  /** Switch halves without leaving the page. */
  setPeople: (tab: PeopleTab) => void;
  /** Leave the page. Returns the dock to nav, because the tabs it was showing
   *  belong to a page that is no longer there. */
  closePeople: () => void;
}

export const useCommunityDock = create<CommunityDockState>((set) => ({
  active: false,
  enabled: false,
  mode: "nav",
  view: "us",
  people: null,
  enter: () => set({ active: true, mode: "nav", view: "us", people: null }),
  // `enabled` tracks pairing (owned by the isPaired effect), NOT focus — `active`
  // already gates the morph on blur. Resetting it here would leave it stuck false
  // on return (isPaired doesn't change across the round-trip, so the effect won't
  // re-set it), breaking the morph after coming back from another screen.
  // `people` IS cleared here, unlike `enabled`. Leaving the screen with the
  // page open and coming back later would restore a dock whose tabs belong to
  // a view you did not arrive at.
  leave: () => set({ active: false, mode: "nav", people: null }),
  setEnabled: (enabled) => set({ enabled }),
  setMode: (mode) => set({ mode }),
  setView: (view) => set({ view }),
  openPeople: (tab) => set({ people: tab, mode: "nav" }),
  setPeople: (tab) => set({ people: tab }),
  closePeople: () => set({ people: null, mode: "nav" }),
}));
