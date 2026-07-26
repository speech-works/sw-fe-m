import { selectForYou, FOR_YOU_LIMIT } from "../forYou";
import type { OfferItem, Offers } from "../../../api/users";

const offer = (key: string, extra: Partial<OfferItem> = {}): OfferItem =>
  ({
    key,
    title: key,
    shelf: "regular",
    tierProductId: `sw.tier.${key}`,
    priceInr: 999,
    priceUsd: 12,
    anchorPriceInr: 1999,
    anchorPriceUsd: 24,
    owned: false,
    packId: `pack-${key}`,
    match: null,
    ...extra,
  }) as OfferItem;

const offers = (items: OfferItem[], extra: Partial<Offers> = {}): Offers =>
  ({
    signalLevel: "intent",
    items,
    ...extra,
  }) as Offers;

describe("selectForYou", () => {
  it("keeps the server's order exactly — it is the ranking", () => {
    // Deliberately neither alphabetical nor price-sorted, so any accidental
    // re-sort shows up. The backend ranks these; re-ordering them here would
    // throw the personalisation away and look like it still worked.
    const items = [offer("word_swap"), offer("art_of_disclosure"), offer("bouncing_back")];
    expect(selectForYou(offers(items)).items.map((i) => i.key)).toEqual([
      "word_swap",
      "art_of_disclosure",
      "bouncing_back",
    ]);
  });

  it("shows nothing at all when the backend has no signal", () => {
    // The fabricated-claim guard: even with populated match objects, a
    // "For you" shelf built on no signal is an ad wearing a recommendation's
    // clothes. Note the items below DO carry reasons — this must still be empty.
    const items = [offer("word_swap", { match: { level: "top", reason: "You said…" } })];
    const result = selectForYou(offers(items, { signalLevel: "none" }));
    expect(result.items).toEqual([]);
    expect(result.highlightFirst).toBe(false);
  });

  it("drops packs they already own — Home sells, it does not re-sell", () => {
    const items = [offer("owned_one", { owned: true }), offer("word_swap")];
    expect(selectForYou(offers(items)).items.map((i) => i.key)).toEqual(["word_swap"]);
  });

  it("drops a product with no pack behind it, rather than opening a dead page", () => {
    const items = [offer("ghost", { packId: null }), offer("word_swap")];
    expect(selectForYou(offers(items)).items.map((i) => i.key)).toEqual(["word_swap"]);
  });

  it("shows three of ten and reports the other seven", () => {
    const items = Array.from({ length: 10 }, (_, i) => offer(`p${i}`));
    const result = selectForYou(offers(items));
    expect(result.items).toHaveLength(FOR_YOU_LIMIT);
    expect(result.remaining).toBe(7);
  });

  it("reports nothing remaining when everything eligible is already shown", () => {
    // Guards "Show more" leading to the same three packs.
    const items = [offer("a"), offer("b"), offer("c")];
    expect(selectForYou(offers(items)).remaining).toBe(0);
  });

  it("counts remaining AFTER filtering, not before", () => {
    // Four items, but three are owned — so one is shown and none remain.
    // Counting before the filter would promise more that doesn't exist.
    const items = [
      offer("a"),
      offer("b", { owned: true }),
      offer("c", { owned: true }),
      offer("d", { owned: true }),
    ];
    const result = selectForYou(offers(items));
    expect(result.items.map((i) => i.key)).toEqual(["a"]);
    expect(result.remaining).toBe(0);
  });

  describe("the highlight is earned by a reason, not by a level", () => {
    it("highlights when the first slide carries a reason", () => {
      const items = [offer("a", { match: { level: "top", reason: "You said phone calls…" } })];
      expect(selectForYou(offers(items)).highlightFirst).toBe(true);
    });

    it("still highlights when nothing is tagged 'top' but the first has a reason", () => {
      // THE REGRESSION THIS FILE EXISTS FOR. `"top"` is assigned only when the
      // top-ranked pack ALSO produced a reason, so a `level === "top"` filter
      // renders an un-highlighted — or entirely empty — carousel for a real
      // user with real matches.
      const items = [
        offer("a", { match: { level: "strong", reason: "You said interviews…" } }),
        offer("b", { match: { level: "strong", reason: "Because you want…" } }),
      ];
      const result = selectForYou(offers(items));
      expect(result.items).toHaveLength(2);
      expect(result.highlightFirst).toBe(true);
    });

    it("does not highlight a match object with no reason in it", () => {
      const items = [offer("a", { match: { level: "top" } as any })];
      expect(selectForYou(offers(items)).highlightFirst).toBe(false);
    });

    it("does not highlight when the first slide earned nothing", () => {
      const items = [offer("a"), offer("b", { match: { level: "strong", reason: "…" } })];
      expect(selectForYou(offers(items)).highlightFirst).toBe(false);
    });
  });

  describe("mode — the single decision the render AND the analytics both read", () => {
    it("hides only when they own everything openable", () => {
      // The one state where rendering nothing is right: the sibling card is
      // already saying "today's work is done".
      const items = [offer("a", { owned: true }), offer("b", { owned: true })];
      expect(selectForYou(offers(items)).mode).toBe("hidden");
    });

    it("browses — not hides — when there is no signal yet", () => {
      // THE BUG THIS REPLACED. Returning nothing here left a blank space on
      // Home for a brand-new user, which is the one case guaranteed to hit it.
      const items = [offer("a"), offer("b")];
      const result = selectForYou(offers(items, { signalLevel: "none" }));
      expect(result.mode).toBe("browse");
    });

    it("browses when the fetch failed outright", () => {
      expect(selectForYou(null).mode).toBe("browse");
    });

    it("browses on an empty catalogue rather than claiming nothing is left", () => {
      // No items at all is a config state, not "you've finished everything".
      expect(selectForYou(offers([])).mode).toBe("browse");
    });

    it("browses when every item is unopenable", () => {
      const items = [offer("ghost", { packId: null })];
      expect(selectForYou(offers(items)).mode).toBe("browse");
    });

    it("shows the carousel when there is genuinely something to suggest", () => {
      expect(selectForYou(offers([offer("a")])).mode).toBe("carousel");
    });

    it("owning everything beats having no signal — they still see nothing", () => {
      // Order matters: both conditions are true at once for someone who bought
      // everything before onboarding. Hiding is right; a browse card would be
      // a shop that won't take no for an answer.
      const items = [offer("a", { owned: true })];
      expect(selectForYou(offers(items, { signalLevel: "none" })).mode).toBe("hidden");
    });
  });

  it("survives an empty catalogue, a null response, and a missing items array", () => {
    expect(selectForYou(offers([])).items).toEqual([]);
    expect(selectForYou(null).items).toEqual([]);
    expect(selectForYou({ signalLevel: "intent" } as Offers).items).toEqual([]);
  });
});
