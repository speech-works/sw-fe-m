import { create } from "zustand";

export type DockMode = "nav" | "tabs";
export type CommunityView = "us" | "timeline";

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
   * The requests list has taken over the Community screen, and with it the dock.
   *
   * Deliberately NOT a third value of `mode`, and deliberately NOT gated on
   * `enabled`. `mode` is the paired-only Us/Timeline switcher; requests exist
   * mainly for people who have no buddy yet, which is precisely when `enabled`
   * is false. Keeping them as separate axes means neither can accidentally
   * disable the other.
   *
   * It is a MODE OF THE SCREEN, not a toggle of its own: `enter`/`leave` clear
   * it, so it can never outlive the visit that opened it. That is what makes
   * the system back gesture put the nav dock back with no extra wiring.
   */
  requestsOpen: boolean;
  /** On Community focus — always land on Us, in nav mode. */
  enter: () => void;
  /** On Community blur — release the dock back to global nav. */
  leave: () => void;
  setEnabled: (enabled: boolean) => void;
  setMode: (mode: DockMode) => void;
  setView: (view: CommunityView) => void;
  /** Open the requests list. Drops the Us/Timeline morph on the way in, so the
   *  dock is never asked to be two things at once. */
  openRequests: () => void;
  closeRequests: () => void;
}

export const useCommunityDock = create<CommunityDockState>((set) => ({
  active: false,
  enabled: false,
  mode: "nav",
  view: "us",
  requestsOpen: false,
  enter: () => set({ active: true, mode: "nav", view: "us", requestsOpen: false }),
  // `enabled` tracks pairing (owned by the isPaired effect), NOT focus — `active`
  // already gates the morph on blur. Resetting it here would leave it stuck false
  // on return (isPaired doesn't change across the round-trip, so the effect won't
  // re-set it), breaking the morph after coming back from another screen.
  // `requestsOpen` IS cleared here, unlike `enabled`. Leaving the screen with
  // the list open and coming back to it later would restore a dock whose back
  // chevron points at a screen you did not arrive from.
  leave: () => set({ active: false, mode: "nav", requestsOpen: false }),
  setEnabled: (enabled) => set({ enabled }),
  setMode: (mode) => set({ mode }),
  setView: (view) => set({ view }),
  openRequests: () => set({ requestsOpen: true, mode: "nav" }),
  closeRequests: () => set({ requestsOpen: false }),
}));
