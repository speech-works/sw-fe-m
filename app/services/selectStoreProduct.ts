/**
 * Picks the ONE store product to charge for a requested product id.
 *
 * Why this isn't just `products[0]`:
 *
 * Google Play splits a subscription into a *subscription id* and one or more
 * *base plan ids*, and RevenueCat surfaces each base plan as its own
 * `PurchasesStoreProduct` whose `identifier` is `<subscriptionId>:<basePlanId>`.
 * So `getProducts(["sw.membership.monthly"])` returns one entry per base plan —
 * exactly one today, because we ship one base plan per subscription, but the
 * moment anyone adds a second (a promo plan, a regional plan) `products[0]`
 * silently becomes "whichever the store happened to list first". That is a
 * wrong-price charge with no error and no log — the worst class of money bug.
 *
 * So: resolve deterministically, and when it is genuinely ambiguous, REFUSE.
 * A visible "not available right now" that we log loudly is strictly better
 * than quietly billing someone the wrong amount, and the ambiguity can only
 * appear as a direct result of someone adding a base plan — i.e. it surfaces in
 * that person's own sandbox test, not months later in production.
 *
 * The escape hatch is deliberate and cheap: pass the fully-qualified
 * `"<subscriptionId>:<basePlanId>"` and rule 1 matches it exactly.
 *
 * Kept free of any `react-native-purchases` import (structural `{identifier}`
 * type only) so it unit-tests without the native module — same reasoning as
 * `normalizeReminderDate` and `buildPushMessage`.
 */

export type ProductSelection<T> =
  | { ok: true; product: T }
  | { ok: false; reason: "not_found" }
  | { ok: false; reason: "ambiguous"; candidates: string[] };

/** The subscription id half of a Play `"<subscriptionId>:<basePlanId>"`. */
export function baseProductId(identifier: string): string {
  const colon = identifier.indexOf(":");
  return colon === -1 ? identifier : identifier.slice(0, colon);
}

export function selectStoreProduct<T extends { identifier: string }>(
  requestedId: string,
  products: readonly T[],
): ProductSelection<T> {
  // 1. An exact identifier match is unambiguous by definition. Covers Apple,
  //    every Play one-time product, and a caller that already knows the base
  //    plan it wants.
  const exact = products.find((p) => p.identifier === requestedId);
  if (exact) return { ok: true, product: exact };

  // 2. Otherwise treat the request as a Play subscription id and match every
  //    base plan hanging off it.
  const matches = products.filter(
    (p) => baseProductId(p.identifier) === requestedId,
  );

  if (matches.length === 1) return { ok: true, product: matches[0] };
  if (matches.length === 0) return { ok: false, reason: "not_found" };

  return {
    ok: false,
    reason: "ambiguous",
    candidates: matches.map((p) => p.identifier),
  };
}
