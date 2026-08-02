import {
  resolvePriceDisplay,
  formatCurrency,
  formatInr,
  formatUsd,
  deriveAnchor,
  savingLabelFor,
  savingPercentFor,
} from "../priceDisplay";

const inr = (s: string, n = 0) => ({ priceString: s, price: n, currencyCode: "INR" });
const usd = (s: string, n = 0) => ({ priceString: s, price: n, currencyCode: "USD" });
const gbp = (s: string, n = 0) => ({ priceString: s, price: n, currencyCode: "GBP" });

describe("formatters", () => {
  it("groups INR the Indian way and drops paise", () => {
    expect(formatInr(499)).toBe("₹499");
    expect(formatInr(1999)).toBe("₹1,999");
    expect(formatInr(1499.4)).toBe("₹1,499");
  });

  it("always shows two decimals for USD", () => {
    expect(formatUsd(6.99)).toBe("$6.99");
    expect(formatUsd(35)).toBe("$35.00");
  });

  it("formatCurrency handles our two core currencies", () => {
    expect(formatCurrency(500, "INR")).toContain("500");
    expect(formatCurrency(6.99, "USD")).toContain("6.99");
  });
});

describe("resolvePriceDisplay — store price wins", () => {
  it("shows the store's own string, never a re-formatted one", () => {
    const r = resolvePriceDisplay({ store: usd("$6.99"), inr: 499, usd: 6.99 });
    expect(r.price).toBe("$6.99");
    expect(r.exact).toBe(true);
    expect(r.currencyCode).toBe("USD");
  });

  it("THE BUG: a US buyer never sees rupees", () => {
    const r = resolvePriceDisplay({
      store: usd("$6.99"),
      inr: 499,
      usd: 6.99,
      anchorInr: 999,
      anchorUsd: 9.99,
    });
    expect(r.price).not.toContain("₹");
    expect(r.anchor).not.toContain("₹");
  });

  it("trusts the store even if it disagrees with the backend (store is truth)", () => {
    // Console says ₹599, backend still thinks ₹499 — the charge is ₹599.
    const r = resolvePriceDisplay({ store: inr("₹599"), inr: 499, usd: 6.99 });
    expect(r.price).toBe("₹599");
  });
});

describe("resolvePriceDisplay — the anchor, and when to hide it", () => {
  it("shows an INR anchor to an INR buyer", () => {
    const r = resolvePriceDisplay({
      store: inr("₹499"), inr: 499, usd: 6.99, anchorInr: 999, anchorUsd: 9.99,
    });
    expect(r.anchor).toBe("₹999");
  });

  it("shows a USD anchor to a USD buyer", () => {
    const r = resolvePriceDisplay({
      store: usd("$6.99"), inr: 499, usd: 6.99, anchorInr: 999, anchorUsd: 9.99,
    });
    expect(r.anchor).toBe("$9.99");
  });

  it("HIDES the anchor in a currency we cannot price — never mixes currencies", () => {
    const r = resolvePriceDisplay({
      store: gbp("£5.99"), inr: 499, usd: 6.99, anchorInr: 999, anchorUsd: 9.99,
    });
    expect(r.price).toBe("£5.99");
    expect(r.anchor).toBeNull(); // "₹999" struck over "£5.99" would be nonsense
  });

  it("no strike when nothing is actually discounted", () => {
    expect(
      resolvePriceDisplay({
        store: inr("₹999"), inr: 999, usd: 9.99, anchorInr: 999, anchorUsd: 9.99,
      }).anchor,
    ).toBeNull();
  });

  it("no strike when the anchor is somehow BELOW the price (bad data)", () => {
    expect(
      resolvePriceDisplay({
        store: inr("₹999"), inr: 999, usd: 9.99, anchorInr: 499, anchorUsd: 4.99,
      }).anchor,
    ).toBeNull();
  });

  it("no strike when the anchor is missing entirely", () => {
    expect(
      resolvePriceDisplay({ store: inr("₹499"), inr: 499, usd: 6.99 }).anchor,
    ).toBeNull();
  });
});

describe("resolvePriceDisplay — fallbacks (the store said nothing)", () => {
  it.each([
    ["undefined", undefined],
    ["null", null],
    ["empty priceString", { priceString: "", price: 6.99, currencyCode: "USD" }],
    ["empty currencyCode", { priceString: "$6.99", price: 6.99, currencyCode: "" }],
  ])("falls back to INR when store is %s", (_label, store) => {
    const r = resolvePriceDisplay({
      store: store as never, inr: 499, usd: 6.99, anchorInr: 999, anchorUsd: 9.99,
    });
    expect(r.price).toBe("₹499");
    expect(r.anchor).toBe("₹999");
    expect(r.exact).toBe(false);
    expect(r.currencyCode).toBe("INR");
  });

  it("the fallback is exactly the old behaviour — payments off, offline, or product not yet created", () => {
    // This is TODAY's state: products don't exist in Play Console yet.
    const r = resolvePriceDisplay({ inr: 1999, usd: 19.99, anchorInr: 1999 });
    expect(r.price).toBe("₹1,999");
    expect(r.anchor).toBeNull();
    expect(r.exact).toBe(false);
  });
});

describe("anchorStore — a real store 'was' price, in ANY currency", () => {
  it("uses the store's anchor string for a currency we have no price book for", () => {
    const r = resolvePriceDisplay({
      store: gbp("£5.99", 5.99),
      anchorStore: gbp("£9.99", 9.99),
      inr: 499, usd: 6.99, anchorInr: 999, anchorUsd: 9.99,
    });
    expect(r.price).toBe("£5.99");
    expect(r.anchor).toBe("£9.99"); // was impossible before
    expect(r.anchorAmount).toBe(9.99);
  });

  it("ignores an anchor from a DIFFERENT currency", () => {
    const r = resolvePriceDisplay({
      store: gbp("£5.99", 5.99),
      anchorStore: usd("$9.99", 9.99),
      inr: 499, usd: 6.99,
    });
    expect(r.anchor).toBeNull();
  });

  it("ignores a store anchor that is not actually higher", () => {
    expect(
      resolvePriceDisplay({
        store: gbp("£9.99", 9.99),
        anchorStore: gbp("£5.99", 5.99),
        inr: 999, usd: 9.99,
      }).anchor,
    ).toBeNull();
  });
});

describe("deriveAnchor — the annual membership's 12x 'was'", () => {
  it("builds a 12x anchor in the buyer's own currency", () => {
    const a = deriveAnchor(gbp("£3.99", 3.99), 12);
    expect(a?.price).toBeCloseTo(47.88, 2);
    expect(a?.currencyCode).toBe("GBP");
    expect(a?.priceString).toContain("47.88");
  });

  it("returns null on unusable input rather than inventing a price", () => {
    expect(deriveAnchor(null, 12)).toBeNull();
    expect(deriveAnchor(undefined, 12)).toBeNull();
    expect(deriveAnchor(gbp("£3.99", 3.99), 0)).toBeNull();
    expect(deriveAnchor(gbp("£3.99", 3.99), -1)).toBeNull();
    expect(deriveAnchor({ priceString: "", price: 1, currencyCode: "GBP" }, 12)).toBeNull();
  });
});

describe("savings — the line and the percentage", () => {
  const annualInr = resolvePriceDisplay({
    store: inr("₹1,499", 1499), inr: 1499, usd: 34.99,
    anchorInr: 2388, anchorUsd: 59.88,
  });
  const annualUsd = resolvePriceDisplay({
    store: usd("$34.99", 34.99), inr: 1499, usd: 34.99,
    anchorInr: 2388, anchorUsd: 59.88,
  });

  it("quotes the saving in the currency actually on screen", () => {
    expect(savingLabelFor(annualInr)).toContain("889");
    expect(savingLabelFor(annualUsd)).toContain("24.89");
  });

  it("THE BUG: the percentage differs by currency and must follow the screen", () => {
    // ₹1499 vs ₹2388 = 37%.  $34.99 vs $59.88 = 42%.
    expect(savingPercentFor(annualInr)).toBe(37);
    expect(savingPercentFor(annualUsd)).toBe(42);
  });

  it("withholds both when there is no honest saving", () => {
    const flat = resolvePriceDisplay({ store: inr("₹999", 999), inr: 999, usd: 9.99 });
    expect(savingLabelFor(flat)).toBeNull();
    expect(savingPercentFor(flat)).toBeNull();
  });
});

describe("formatCurrency", () => {
  it("formats currencies we have no symbol table for", () => {
    expect(formatCurrency(47.88, "GBP")).toContain("47.88");
    expect(formatCurrency(1000, "JPY")).toBeTruthy();
  });

  it("keeps INR whole-rupee", () => {
    expect(formatCurrency(1499.6, "INR")).not.toContain(".");
  });

  it("returns null rather than guessing", () => {
    expect(formatCurrency(NaN, "USD")).toBeNull();
    expect(formatCurrency(10, "")).toBeNull();
  });
});
