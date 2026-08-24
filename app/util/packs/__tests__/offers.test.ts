import { selectOffer, isOpenable, priceNoteFor } from "../offers";
import type { OfferItem } from "../../../api";

const offer = (
  key: string,
  shelf: OfferItem["shelf"],
  priceInr: number,
  extra: Partial<OfferItem> = {},
): OfferItem =>
  ({
    key,
    title: key,
    shelf,
    tierProductId: `sw.tier.${priceInr}`,
    priceInr,
    priceUsd: 49,
    owned: false,
    packId: `pack-${key}`,
    ...extra,
  }) as OfferItem;

describe("selectOffer — never sell the wrong product", () => {
  const items = [
    offer("interview_ready", "regular", 999),
    offer("stabilization", "small", 199),
  ];

  it("returns the offer whose key matches", () => {
    expect(selectOffer(items, "interview_ready")?.priceInr).toBe(999);
  });

  it("returns null when the key is absent — it does NOT fall back to another product", () => {
    // The shipped bug: `?? items[0]` rendered the Stabilization Pack under
    // Interview Ready's heading and bullet points at Stabilization's price the
    // moment Interview Ready was marked unavailable. Nothing on screen would
    // have told the user, and the price shown was not the price of what they
    // were reading about.
    expect(selectOffer(items, "interview_ready_retired")).toBeNull();
  });

  it("returns null for an empty catalog rather than throwing", () => {
    expect(selectOffer([], "anything")).toBeNull();
  });
});

describe("isOpenable", () => {
  it("is false when the catalog advertises something no pack delivers", () => {
    // packId null means catalog/data drift. Opening a detail page for it would
    // show a brochure that cannot load.
    expect(isOpenable(offer("orphan", "small", 199, { packId: null }))).toBe(
      false,
    );
  });

  it("is true for a normal product", () => {
    expect(isOpenable(offer("fine", "regular", 999))).toBe(true);
  });
});

describe("priceNoteFor — the note may never outlive the strike", () => {
  const discounted = offer("deal", "regular", 999, {
    priceUsd: 12,
    anchorPriceInr: 1999,
    anchorPriceUsd: 24,
  });
  const price = (priceString: string, value: number, currencyCode: string) => ({
    priceString,
    price: value,
    currencyCode,
  });

  it("says nothing when the backend anchor is not above the price", () => {
    const flat = offer("flat", "regular", 999, { anchorPriceInr: 999 });
    expect(priceNoteFor(flat, false)).toBeUndefined();
  });

  it("names the discount for an INR buyer with no store data", () => {
    expect(priceNoteFor(discounted, false)).toBe("Launch offer");
    expect(priceNoteFor(discounted, true)).toBe("Founder price");
  });

  /**
   * The defect. A buyer in London gets NO strike, because an INR anchor cannot
   * honestly be struck over a pound price and we refuse to convert one. The note
   * used to appear anyway, so "Launch offer" sat under a bare "£5.99" explaining
   * a reduction that was nowhere on screen.
   */
  it("says nothing in a currency that has no strike to explain", () => {
    expect(
      priceNoteFor(discounted, false, price("£5.99", 5.99, "GBP"), null),
    ).toBeUndefined();
  });

  it("says nothing when the store's own anchor is not above the price", () => {
    // A regional price point can land the anchor tier at or below the charged
    // tier. The store has then said this buyer has no discount.
    expect(
      priceNoteFor(
        discounted,
        false,
        price("₹999", 999, "INR"),
        price("₹999", 999, "INR"),
      ),
    ).toBeUndefined();
  });

  it("names the discount in any currency once the store quotes both prices", () => {
    expect(
      priceNoteFor(
        discounted,
        false,
        price("£5.99", 5.99, "GBP"),
        price("£11.99", 11.99, "GBP"),
      ),
    ).toBe("Launch offer");
  });
});
