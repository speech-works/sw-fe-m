import { selectOffer, isOpenable } from "../offers";
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
