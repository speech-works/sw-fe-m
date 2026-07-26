import type { OfferItem, Offers } from "../../api/users";
import { isOpenable } from "./offers";

/**
 * Which programs Home suggests, and whether it may claim anything about them.
 *
 * Home used to show exactly ONE pack, because it asked an endpoint that returns
 * exactly one. Meanwhile the shop endpoint has always returned all ten, already
 * ranked, each tagged `match: { level: "top" | "strong" }` — and `"strong"` was
 * read nowhere in the app. We ranked ten and sold one.
 */

/** How many suggestions Home shows before "Show more". */
export const FOR_YOU_LIMIT = 3;

/**
 * What the shelf should do. ONE decision, made here, so the rendered card and
 * the analytics event can never disagree about which of them happened — the
 * sibling card carries a comment about that exact class of bug ("the event
 * never claims a card that isn't shown"), and two independent `if` chains is
 * how you get there.
 */
export type ForYouMode =
  /** Show the ranked slides. */
  | "carousel"
  /** Nothing we can claim a match for, but there IS something to browse. */
  | "browse"
  /** Genuinely nothing to sell — they own everything openable. Render nothing. */
  | "hidden";

export interface ForYouSelection {
  mode: ForYouMode;
  /** The slides, in SERVER ORDER. Never re-sorted, never padded. */
  items: OfferItem[];
  /** Give slide 1 the vivid treatment — only when it actually earned a reason. */
  highlightFirst: boolean;
  /** Eligible items beyond the ones shown. Gates "Show more". */
  remaining: number;
}

const browse = (): ForYouSelection => ({
  mode: "browse",
  items: [],
  highlightFirst: false,
  remaining: 0,
});

/**
 * `slice(0, limit)` is a positional read, and `offers.ts` forbids one — so this
 * deserves a word. The banned pattern is `find(key) ?? items[0]`: substituting a
 * DIFFERENT product into a slot that named a specific product, which shipped
 * once and showed the wrong pack at the wrong price. Here nothing is named. The
 * slot is "the top N in the server's order", and taking a prefix of a ranked
 * list preserves that ranking exactly. Filtering preserves relative order too.
 *
 * What must never happen: re-sorting, or padding a short list to reach N.
 */
export function selectForYou(
  offers: Offers | null,
  limit: number = FOR_YOU_LIMIT,
): ForYouSelection {
  // A failed fetch. Something to browse is still better than a hole on Home.
  if (!offers) return browse();

  const all = offers.items ?? [];

  // Home sells; it does not re-sell. Owned packs are the other card's job.
  // `isOpenable` drops catalog drift — a product with no pack behind it opens
  // a detail page that cannot load.
  const eligible = all.filter((i) => !i.owned && isOpenable(i));

  // THEY OWN EVERYTHING. The only state where rendering nothing is right: the
  // sibling card is already saying "today's work is done", and a browse card
  // under that is a shop that won't take no for an answer. Checked BEFORE
  // signalLevel, because it stays true regardless of signal.
  //
  // Deliberately `every(owned)` and NOT `eligible.length === 0`. Those differ
  // when the catalogue advertises products with no pack behind them: nothing
  // is eligible, but the user owns nothing either. That is a config fault on
  // our side, and hiding the shelf would turn it into a blank space on Home
  // instead of a browse card.
  if (all.length > 0 && all.every((i) => i.owned)) {
    return { mode: "hidden", items: [], highlightFirst: false, remaining: 0 };
  }

  // `"none"` means the backend has nothing to go on and is sending no badges
  // anywhere. A "For you" shelf with no basis is the one thing that would make
  // Home read as an ad, so the caller shows the neutral browse card instead.
  if (offers.signalLevel === "none") return browse();

  const items = eligible.slice(0, Math.max(0, limit));

  // Signal exists but nothing survived the filters (empty catalogue, or every
  // item unopenable). Browse rather than a blank.
  if (items.length === 0) return browse();

  return {
    mode: "carousel",
    items,
    // NOT `match.level === "top"`. That level is only assigned when the
    // top-ranked pack ALSO produced a reason, so a level test would leave a
    // real, badged first slide un-highlighted whenever the winner earned its
    // place on clinical score alone. The reason is what earns the highlight,
    // so test for the reason.
    highlightFirst: !!items[0]?.match?.reason,
    remaining: Math.max(0, eligible.length - items.length),
  };
}
