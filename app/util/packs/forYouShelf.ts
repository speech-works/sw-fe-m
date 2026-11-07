import type { OfferItem, Offers } from "../../api/users";
import type { CrisisResource } from "../../api/crisis";
import type { ActiveProgram } from "../../components/Dashboard/useActiveProgram";
import { isOpenable } from "./offers";
import { selectForYou, type ForYouSelection } from "./forYou";

/**
 * ===========================================================================
 * WHAT THE HOME PROGRAMS SHELF SHOWS, AS ONE PURE DECISION
 * ---------------------------------------------------------------------------
 * `selectForYou` decides what to do with the OFFERS. This decides what the
 * shelf draws once it also knows what the person owns and is doing. It was an
 * `if` chain inside ForYouCarousel, which is how a founder test account that
 * owned all ten programs and had started none got a blank space on Home: the
 * offers said "hidden" (nothing to sell), the active program was still loading
 * or had failed, and the chain fell through to `return null`.
 *
 * The rules this keeps, from the shelf's history:
 * - The server's ranked list is never padded or re-sorted. Offer slides are a
 *   prefix of it, carried with their RANK (`offerIndex`), not their position.
 * - In crisis, the support card, and never a program to buy.
 * - A failed offers fetch never blanks the shelf.
 * - `variant` is read by the analytics events, from the same object the
 *   render reads, so an event can never claim a card that is not shown.
 * - Home is never blank for somebody who owns programs.
 * ===========================================================================
 */

/** The tile at the end of the carousel, and which door it is. */
export type MoreTileVariant =
  /** After real slides: the rest of the catalogue. */
  | "more"
  /** After no offer slides: the whole catalogue. */
  | "all"
  /** After the no-signal programs: the whole catalogue, "See all". */
  | "seeAll"
  /** They own everything: the programs they are not in right now. */
  | "others";

export type ShelfSlide =
  /**
   * `offerIndex` is its RANK AMONG OFFERS, which is not its position in the
   * carousel. `eyebrow` replaces the program's own eyebrow line when set.
   */
  | { kind: "offer"; item: OfferItem; offerIndex: number; eyebrow?: string }
  | { kind: "inProgress"; program: ActiveProgram }
  /** `count` is how many programs they own, or null when we cannot tell. */
  | { kind: "allComplete"; count: number | null }
  | { kind: "more"; variant: MoreTileVariant; count?: number };

/**
 * The `variant` on RECOMMENDATION_SHOWN and FOR_YOU_SHELF_VIEWED. Each new
 * state has its own value, so no dashboard reads a new card as an old one.
 */
export type ShelfVariant =
  /** Signal-backed offers, with or without the program they are in. */
  | "carousel"
  /** The old browse card, or a program slide with only the catalogue tile. */
  | "browse_fallback"
  /** H1a: owns nothing, no signal, real programs under "Programs". */
  | "programs_no_signal"
  /** H1d: finished what they own, the top offer leads. */
  | "next_after_finished"
  /** H1e: owns everything, has started none. */
  | "owner_pick"
  /** H1f: owns everything, one under way, a tile for the rest. */
  | "owner_others"
  /** H1g: owns everything and finished it all. */
  | "all_finished";

export type ShelfView =
  /** Nothing to draw yet: the first offers fetch, or the owner's program. */
  | { kind: "skeleton" }
  | { kind: "crisis"; resource: CrisisResource; variant: ShelfVariant }
  | { kind: "browse"; variant: ShelfVariant }
  | { kind: "ownerPick"; count: number; variant: ShelfVariant }
  | { kind: "allComplete"; count: number | null; variant: ShelfVariant }
  | {
      kind: "carousel";
      heading: "For you" | "Programs";
      /** The heading's right-hand link, or null for none. */
      headerAction: { label: string; a11y: string } | null;
      slides: ShelfSlide[];
      /** Give the top-ranked OFFER the vivid treatment. */
      highlightFirst: boolean;
      variant: ShelfVariant;
    };

export interface ShelfInput {
  offers: Offers | null;
  /** The first offers fetch has not settled yet. */
  offersLoading: boolean;
  active: {
    loading: boolean;
    program: ActiveProgram | null;
    allComplete: boolean;
  };
  /** Pass the render's own selection so both read one object. */
  selection?: ForYouSelection;
}

const offerSlides = (
  items: OfferItem[],
  from = 0,
): Extract<ShelfSlide, { kind: "offer" }>[] =>
  items
    .map((item, offerIndex) => ({ kind: "offer" as const, item, offerIndex }))
    .slice(from);

const HEADER_ACTION: Record<"more" | "all" | "seeAll", { label: string; a11y: string }> = {
  more: { label: "See more", a11y: "See more programs" },
  all: { label: "Browse all", a11y: "Browse all programs" },
  seeAll: { label: "See all", a11y: "See all programs" },
};

/**
 * The eyebrow on the program that follows a finished one. Fixed words, not
 * `NEXT AFTER {title}`: the eyebrow row is one line on every slide, and with
 * the catalogue growing, program names only get longer ("NEXT AFTER THE
 * PANIC…" was already cut off). The finished program sits right after it.
 */
export const NEXT_PROGRAM_EYEBROW = "TRY THIS NEXT";

/**
 * The tile to the rest of what they own. No number: a count tells people how
 * small the catalogue is, and it grows (founder, 2026-11-07).
 */
export const otherProgramsTitle = (_n: number): string => "More programs you own";

/** No number, for the same reason as `otherProgramsTitle`. */
export const allFinishedTitle = (_n: number | null): string =>
  "You finished your programs.";

/** Owner card. No number, for the same reason as `otherProgramsTitle`. */
export const OWNER_PICK_TITLE = "Ready when you are";
export const ownerPickSubtitle = (_n: number): string =>
  "Start any of your programs from day 1.";

export function buildShelf(input: ShelfInput): ShelfView {
  const { offers, offersLoading, active } = input;
  const selection = input.selection ?? selectForYou(offers);
  const program = active.program;
  const crisis = offers?.crisisSupport ?? null;

  const all = offers?.items ?? [];
  const ownedCount = all.filter((i) => i.owned && isOpenable(i)).length;
  const unownedOpenable = all.some((i) => !i.owned && isOpenable(i));
  /** `hidden` is exactly "every product is owned". */
  const ownsAll = selection.mode === "hidden";
  /** Offers we may put on the shelf, signal-backed or not, in server order. */
  const sellable = selection.mode === "carousel" || selection.mode === "programs"
    ? selection.items
    : [];
  const heading = selection.mode === "programs" ? "Programs" : "For you";
  const moreAfterOffers: ShelfSlide[] =
    selection.remaining > 0
      ? [{ kind: "more", variant: selection.mode === "programs" ? "seeAll" : "more" }]
      : [];
  const headerAfterOffers =
    selection.remaining > 0
      ? HEADER_ACTION[selection.mode === "programs" ? "seeAll" : "more"]
      : null;

  // ── H1g / H1d: the server says they finished everything they own ────────
  // In crisis the support card wins, even with everything done.
  if (!program && active.allComplete && !crisis) {
    if (!offers && offersLoading) return { kind: "skeleton" };
    // Nothing to sell (they own it all, or the fetch failed): the one card.
    if (sellable.length === 0) {
      return {
        kind: "allComplete",
        count: offers ? ownedCount : null,
        variant: "all_finished",
      };
    }
    // More to buy: never only the finished card. The top offer leads.
    const [first, ...rest] = offerSlides(sellable);
    return {
      kind: "carousel",
      heading,
      headerAction: headerAfterOffers,
      slides: [
        first,
        { kind: "allComplete", count: ownedCount },
        ...rest,
        ...moreAfterOffers,
      ],
      highlightFirst: selection.highlightFirst,
      variant: "next_after_finished",
    };
  }

  // First offers load. No heading over the skeleton: it may never appear.
  if (!offers && offersLoading) return { kind: "skeleton" };

  // ── They own every program ──────────────────────────────────────────────
  if (ownsAll && !crisis) {
    // Wait for the program rather than draw nothing, or the wrong card.
    if (!program && active.loading) return { kind: "skeleton" };

    // H1e. No program (the recommender failed, timed out or is still out), or
    // its top pick is one they have never started: let them pick.
    const notStarted =
      !!program && !program.isRefresher && program.packStarted === false;
    if (!program || notStarted) {
      return { kind: "ownerPick", count: ownedCount, variant: "owner_pick" };
    }

    // H1g. They own every program and the server says every one is finished.
    if (program?.isRefresher && active.allComplete) {
      return { kind: "allComplete", count: ownedCount, variant: "all_finished" };
    }

    // H1f. One program on the shelf, and a way to the rest. A finished one
    // counts as well: one finished pack does not mean all of them are.
    const others = ownedCount - 1;
    return {
      kind: "carousel",
      heading: "For you",
      headerAction: null,
      slides: [
        { kind: "inProgress", program },
        ...(others > 0
          ? [{ kind: "more" as const, variant: "others" as const, count: others }]
          : []),
      ],
      highlightFirst: false,
      variant: "owner_others",
    };
  }

  // In crisis: support in the slot, never a program to buy.
  if (!program && crisis) {
    // "browse_fallback" as before, so the existing series does not break.
    return { kind: "crisis", resource: crisis, variant: "browse_fallback" };
  }

  // ── H1d: they finished the program on the shelf, and there is more to buy
  // `isRefresher` is the signal InProgressSlide reads for "YOU FINISHED THIS".
  if (program?.isRefresher && sellable.length > 0 && !crisis) {
    const [first, ...rest] = offerSlides(sellable);
    return {
      kind: "carousel",
      heading,
      headerAction: headerAfterOffers,
      slides: [
        { ...first, eyebrow: NEXT_PROGRAM_EYEBROW },
        { kind: "inProgress", program },
        ...rest,
        ...moreAfterOffers,
      ],
      highlightFirst: selection.highlightFirst,
      variant: "next_after_finished",
    };
  }

  if (!program) {
    // H1a. Owns nothing, no signal: real programs, no claim.
    if (selection.mode === "programs") {
      return {
        kind: "carousel",
        heading: "Programs",
        headerAction: headerAfterOffers,
        slides: [...offerSlides(selection.items), ...moreAfterOffers],
        highlightFirst: false,
        variant: "programs_no_signal",
      };
    }
    // H1b. Signal-backed offers.
    if (selection.mode === "carousel") {
      return {
        kind: "carousel",
        heading: "For you",
        headerAction: headerAfterOffers,
        slides: [...offerSlides(selection.items), ...moreAfterOffers],
        highlightFirst: selection.highlightFirst,
        variant: "carousel",
      };
    }
    // H1h. Failed fetch, or nothing openable: the browse card.
    return { kind: "browse", variant: "browse_fallback" };
  }

  // ── H1c: a program under way, owning some ───────────────────────────────
  // Signal-backed offers follow it. Without signal (or in crisis) it stays as
  // it was: no offer slides, and the catalogue tile when there is one.
  if (selection.mode === "carousel" && !crisis) {
    return {
      kind: "carousel",
      heading: "For you",
      headerAction: headerAfterOffers,
      slides: [
        { kind: "inProgress", program },
        ...offerSlides(selection.items),
        ...moreAfterOffers,
      ],
      highlightFirst: selection.highlightFirst,
      variant: "carousel",
    };
  }
  return {
    kind: "carousel",
    heading: "For you",
    headerAction: unownedOpenable ? HEADER_ACTION.all : null,
    slides: [
      { kind: "inProgress", program },
      ...(unownedOpenable ? [{ kind: "more" as const, variant: "all" as const }] : []),
    ],
    highlightFirst: false,
    variant: "browse_fallback",
  };
}

/** The offer slides a view shows, in rank order, for the analytics events. */
export const shownOffers = (view: ShelfView): OfferItem[] =>
  view.kind === "carousel"
    ? view.slides.flatMap((s) => (s.kind === "offer" ? [s.item] : []))
    : [];
