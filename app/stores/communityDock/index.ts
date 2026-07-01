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
  /** On Community focus — always land on Us, in nav mode. */
  enter: () => void;
  /** On Community blur — release the dock back to global nav. */
  leave: () => void;
  setEnabled: (enabled: boolean) => void;
  setMode: (mode: DockMode) => void;
  setView: (view: CommunityView) => void;
}

export const useCommunityDock = create<CommunityDockState>((set) => ({
  active: false,
  enabled: false,
  mode: "nav",
  view: "us",
  enter: () => set({ active: true, mode: "nav", view: "us" }),
  // `enabled` tracks pairing (owned by the isPaired effect), NOT focus — `active`
  // already gates the morph on blur. Resetting it here would leave it stuck false
  // on return (isPaired doesn't change across the round-trip, so the effect won't
  // re-set it), breaking the morph after coming back from another screen.
  leave: () => set({ active: false, mode: "nav" }),
  setEnabled: (enabled) => set({ enabled }),
  setMode: (mode) => set({ mode }),
  setView: (view) => set({ view }),
}));
