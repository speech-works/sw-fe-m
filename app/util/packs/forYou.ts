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

export interface ForYouSelection {
  /** The slides, in SERVER ORDER. Never re-sorted, never padded. */
  items: OfferItem[];
  /** Give slide 1 the vivid treatment — only when it actually earned a reason. */
  highlightFirst: boolean;
  /** Eligible items beyond the ones shown. Gates "Show more". */
  remaining: number;
}

const EMPTY: ForYouSelection = {
  items: [],
  highlightFirst: false,
  remaining: 0,
};

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
  if (!offers) return EMPTY;

  // `"none"` means the backend has nothing to go on and is sending no badges
  // anywhere. A "For you" shelf with no basis is the one thing that would make
  // Home read as an ad, so the caller shows the neutral browse card instead.
  if (offers.signalLevel === "none") return EMPTY;

  // Home sells; it does not re-sell. Owned packs are the other card's job.
  // `isOpenable` drops catalog drift — a product with no pack behind it opens
  // a detail page that cannot load.
  const eligible = (offers.items ?? []).filter(
    (i) => !i.owned && isOpenable(i),
  );

  const items = eligible.slice(0, Math.max(0, limit));

  return {
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
