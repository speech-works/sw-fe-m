import type { OfferItem } from "../../api";

/**
 * Choosing WHICH product to show, and grouping the shop — the two decisions
 * that touch money, pulled out of the screen so they can be tested.
 *
 * The bug this guards against was real and shipped: the Programs screen did
 *
 *   offers.items.find(i => i.key === "interview_ready") ?? offers.items[0]
 *
 * so marking Interview Ready unavailable for a day would render a DIFFERENT
 * pack under Interview Ready's heading and bullet points, at that other pack's
 * price. Selling the wrong product at the wrong price needed nothing more than
 * a second product existing.
 */

/**
 * The offer for a catalog key, or null. NEVER falls back to another product:
 * showing the wrong thing is worse than showing nothing, because the user
 * cannot tell it happened and the price they see is not the price of what they
 * are reading about.
 */
export function selectOffer(
  items: OfferItem[],
  catalogKey: string,
): OfferItem | null {
  return items.find((i) => i.key === catalogKey) ?? null;
}

export type Shelf = OfferItem["shelf"];

/**
 * NOTE: `groupByShelf` lived here and grouped the shop into cheap-first shelf
 * sections. It was removed when the backend began returning items already
 * RANKED for the user (ShopRankingService) — grouping by price bucket would
 * have re-sorted that ranking away, which is the opposite of the point. Shelf
 * survives as a per-card label, not as the sort order.
 */

/**
 * Whether a product can be opened for a closer look. `packId` is null when the
 * catalog advertises something no pack delivers — a config mistake the backend
 * flags via catalog:verify — and the app must not offer a detail page that
 * cannot load.
 */
export function isOpenable(item: OfferItem): boolean {
  return item.packId !== null && item.packId !== undefined;
}
