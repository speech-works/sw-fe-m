import { create } from "zustand";

/** Which half of the Programs screen is showing. */
export type ProgramsView = "browse" | "yours";

/**
 * ============================================================================
 * THE SHOP'S OWN BOTTOM DOCK
 * ----------------------------------------------------------------------------
 * The Programs screen has two halves that are not the same kind of thing:
 * a catalogue you are deciding about, and a shelf of things you already paid
 * for. They were stacked in one column, so the second card on the shelf was
 * something nobody could buy, and every extra program somebody owned pushed
 * the shop further down. The more they had bought, the less shop they saw.
 *
 * This splits them, and puts the switch in the ONE control that is already at
 * the bottom of the screen. The global `CustomTabBar` reads this store: while
 * Programs is focused it renders Menu / Browse / Yours instead of the global
 * nav, so there is never a second dock stacked under the first.
 *
 * This is the same mechanism Community already uses (see `communityDock`), and
 * deliberately so. One dock, one owner at a time.
 *
 * ── WHY MENU IS IN THERE ───────────────────────────────────────────────────
 * Taking the global nav away from a screen means giving back a way out that
 * does not depend on scroll position. The back arrow lives at the top of the
 * page, which is off-screen the moment somebody is three cards down, so it
 * cannot be the only exit. Community reached the same conclusion and its dock
 * carries the same pill.
 * ============================================================================
 */
interface ProgramsDockState {
  /** Programs is focused and owns the dock right now. */
  active: boolean;
  /** Which half is showing. Source of truth for the screen, not a mirror. */
  view: ProgramsView;
  /**
   * How many programs they own. Drawn as the count ON the Yours tab, which is
   * what stops it reading as an empty room somebody has to open to check.
   *
   * It does NOT gate the morph. A shopper who owns nothing still gets the
   * split dock, because the alternative is a screen whose layout changes shape
   * the first time they buy something.
   */
  ownedCount: number;
  /**
   * What the Menu pill does. Owned by the screen, not the dock: the dock has
   * the tab navigator's `navigation`, and `goBack()` on that pops the TAB, not
   * the stack screen sitting inside it. The screen is the only thing holding a
   * navigator that can actually leave the shop.
   */
  onMenu: (() => void) | null;
  /** On Programs focus. Always lands on Browse: this is a shop. */
  enter: (onMenu: () => void) => void;
  /** On Programs blur. Releases the dock back to the global nav. */
  leave: () => void;
  setView: (view: ProgramsView) => void;
  setOwnedCount: (n: number) => void;
}

export const useProgramsDock = create<ProgramsDockState>((set) => ({
  active: false,
  view: "browse",
  ownedCount: 0,
  onMenu: null,
  enter: (onMenu) => set({ active: true, view: "browse", onMenu }),
  // `ownedCount` survives blur on purpose. It is a fact about the account, not
  // about this visit, and clearing it would flash a countless tab on the way
  // back in before the offers request answers a second time.
  leave: () => set({ active: false, view: "browse", onMenu: null }),
  setView: (view) => set({ view }),
  setOwnedCount: (ownedCount) => set({ ownedCount }),
}));
