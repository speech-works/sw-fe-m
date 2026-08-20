import { useEffect, useState } from "react";
import { getOffers } from "../api/users";
import type { MembershipOffer } from "../api/users";
import { useStorePrices } from "./useStorePrices";
import {
  deriveAnchor,
  formatCurrency,
  resolvePriceDisplay,
} from "../services/priceDisplay";

/**
 * ===========================================================================
 * WHAT MEMBERSHIP COSTS, IN THE BUYER'S OWN MONEY
 * ---------------------------------------------------------------------------
 * One place that answers it, so two screens showing a price can never disagree
 * about what it is.
 *
 * The Payments screen worked this out inline. Putting the same figures on the
 * sales sheet by copying that block would have been the start of exactly the
 * drift its own comments warn about: "a stale price in a button is how a user
 * ends up charged something other than what they were shown".
 *
 * ── EVERY PRICE HERE IS THE STORE'S OWN STRING ─────────────────────────────
 * Apple and Google hand back a formatted, localized price, and it is BY
 * DEFINITION what the buyer will be charged. We never re-format it and never
 * convert it ourselves. A buyer in Ohio sees dollars because the store said
 * dollars, not because we guessed from a country code.
 *
 * ── `priceKnown` IS NOT OPTIONAL ───────────────────────────────────────────
 * Every label falls back to an em dash, and the offers call failing is
 * ordinary (reviewers sit behind datacenter networks). A subscription offered
 * with no price attached is what Guideline 3.1.2 forbids, so any screen that
 * sells must check this before showing a buy control.
 * ===========================================================================
 */
export interface MembershipPrice {
  /** e.g. "₹199", "$2.99". An em dash when the price is not known. */
  monthlyLabel: string;
  /** e.g. "₹1,499", "$34.99". An em dash when not known. */
  annualLabel: string;
  /** The annual price divided by twelve, in the SAME currency it resolved to. */
  annualPerMonthLabel: string;
  /**
   * The struck-through "was" beside the annual price: twelve times the monthly
   * one, which is a real sum rather than an invented anchor. Null when the
   * currency cannot be priced, because a rupee "was" above a pound price is
   * nonsense and converting one ourselves would be a fabricated price.
   */
  annualAnchorLabel: string | null;
  /** False until a real price is known. Never show a buy control without it. */
  priceKnown: boolean;
  /** The raw offer, for callers that need the product ids to purchase. */
  offer: MembershipOffer | null;
}

const DASH = "—";

export function useMembershipPrice(): MembershipPrice {
  const [offer, setOffer] = useState<MembershipOffer | null>(null);

  useEffect(() => {
    let cancelled = false;
    getOffers()
      .then((o) => {
        if (!cancelled) setOffer(o.membership);
      })
      // Swallowed on purpose. A screen that cannot price itself shows an em
      // dash and hides its buy control; it must not throw.
      .catch((e) => console.warn("[useMembershipPrice] offers unavailable:", e));
    return () => {
      cancelled = true;
    };
  }, []);

  const { prices } = useStorePrices([offer?.productId, offer?.annualProductId]);

  const monthly = offer
    ? resolvePriceDisplay({
        store: prices[offer.productId],
        inr: offer.priceInr,
        usd: offer.priceUsd,
      })
    : null;

  const annual = offer
    ? resolvePriceDisplay({
        store: prices[offer.annualProductId],
        // The honest anchor is twelve times the MONTHLY price, exactly as the
        // backend derives it. Scaling the store's own monthly figure keeps that
        // sum in the buyer's currency, so the strike works everywhere rather
        // than only for rupee and dollar buyers.
        anchorStore: deriveAnchor(prices[offer.productId], 12),
        inr: offer.annualPriceInr,
        usd: offer.annualPriceUsd,
        anchorInr: offer.annualAnchorInr,
        anchorUsd: offer.annualAnchorUsd,
      })
    : null;

  return {
    monthlyLabel: monthly?.price ?? DASH,
    annualLabel: annual?.price ?? DASH,
    annualPerMonthLabel:
      (annual?.priceAmount != null
        ? formatCurrency(annual.priceAmount / 12, annual.currencyCode)
        : null) ?? DASH,
    annualAnchorLabel: annual?.anchor ?? null,
    priceKnown: !!annual?.price || !!monthly?.price,
    offer,
  };
}
