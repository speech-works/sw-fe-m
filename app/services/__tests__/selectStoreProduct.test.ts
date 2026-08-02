import {
  baseProductId,
  selectStoreProduct,
} from "../selectStoreProduct";

const p = (identifier: string) => ({ identifier });

describe("baseProductId", () => {
  it("strips a Play base-plan suffix", () => {
    expect(baseProductId("sw.membership.monthly:monthly")).toBe(
      "sw.membership.monthly",
    );
  });

  it("leaves colon-free ids alone (Apple, Play one-time products)", () => {
    expect(baseProductId("sw.tier.999")).toBe("sw.tier.999");
    expect(baseProductId("sw.credits.2")).toBe("sw.credits.2");
  });
});

describe("selectStoreProduct", () => {
  it("matches a one-time product exactly", () => {
    const r = selectStoreProduct("sw.tier.999", [p("sw.tier.999")]);
    expect(r).toEqual({ ok: true, product: p("sw.tier.999") });
  });

  it("finds a subscription's single base plan (the normal Play case)", () => {
    const r = selectStoreProduct("sw.membership.monthly", [
      p("sw.membership.monthly:monthly"),
    ]);
    expect(r.ok && r.product.identifier).toBe("sw.membership.monthly:monthly");
  });

  it("REFUSES to guess when a subscription has several base plans", () => {
    const r = selectStoreProduct("sw.membership.monthly", [
      p("sw.membership.monthly:monthly"),
      p("sw.membership.monthly:promo-2026"),
    ]);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.reason).toBe("ambiguous");
    expect(!r.ok && r.reason === "ambiguous" && r.candidates).toEqual([
      "sw.membership.monthly:monthly",
      "sw.membership.monthly:promo-2026",
    ]);
  });

  it("the escape hatch: a fully-qualified id resolves even when ambiguous", () => {
    const r = selectStoreProduct("sw.membership.monthly:promo-2026", [
      p("sw.membership.monthly:monthly"),
      p("sw.membership.monthly:promo-2026"),
    ]);
    expect(r.ok && r.product.identifier).toBe("sw.membership.monthly:promo-2026");
  });

  it("reports not_found for an empty or non-matching store response", () => {
    expect(selectStoreProduct("sw.tier.999", [])).toEqual({
      ok: false,
      reason: "not_found",
    });
    expect(selectStoreProduct("sw.tier.999", [p("sw.tier.499")])).toEqual({
      ok: false,
      reason: "not_found",
    });
  });

  it("does not confuse a different product that merely shares a prefix", () => {
    const r = selectStoreProduct("sw.membership.month", [
      p("sw.membership.monthly:monthly"),
    ]);
    expect(r).toEqual({ ok: false, reason: "not_found" });
  });

  it("picks the right subscription when both memberships come back together", () => {
    const store = [
      p("sw.membership.monthly:monthly"),
      p("sw.membership.annual:annual"),
    ];
    expect(
      selectStoreProduct("sw.membership.annual", store).ok &&
        selectStoreProduct("sw.membership.annual", store),
    ).toMatchObject({ product: { identifier: "sw.membership.annual:annual" } });
  });
});
