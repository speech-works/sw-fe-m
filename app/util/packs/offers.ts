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

/** Shelf → the one word the app uses for it. */
const SHELF_LABEL: Record<Shelf, string> = {
  small: "Focused",
  regular: "Full program",
  deep: "Deep work",
};

/**
 * The ALL-CAPS eyebrow every program surface prints above a title. The shop list
 * and the Home carousel share it so one product is described the same way in
 * both places — they drifted apart the moment each screen wrote its own.
 *
 * FACTS OFF THE ITEM ONLY. This fills the eyebrow slot on cards that have no
 * match to claim, so it must never imply one. `|| "Program"` is not dead code:
 * a shelf value the app doesn't know yet would otherwise print "UNDEFINED".
 */
export function programEyebrow(item: OfferItem): string {
  const shelf = SHELF_LABEL[item.shelf] || "Program";
  const label = item.arcDays ? `${shelf} · ${item.arcDays} days` : shelf;
  return label.toUpperCase();
}

/**
 * Why a struck-through price is struck through — "Founder price" / "Launch
 * offer" — or null when nothing is actually discounted.
 *
 * THE NULL IS THE POINT. It is keyed off the server's own anchor being higher
 * than the price, never off a flag or a date the app decides, so the app cannot
 * print "Launch offer" beside a price that isn't reduced. Lifted verbatim out of
 * `ProgramSalesFlow` so the shop hero explains a discount in the same words the
 * purchase screen does.
 */
export function priceNoteFor(
  item: OfferItem,
  isFounder: boolean,
): string | undefined {
  if (item.anchorPriceInr <= item.priceInr) return undefined;
  return isFounder ? "Founder price" : "Launch offer";
}
