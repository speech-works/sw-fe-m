import React from "react";
import { View, StyleSheet } from "react-native";
import { Text, spacing, withAlpha } from "../design-system";
import { resolvePriceDisplay, type StorePrice } from "../services/priceDisplay";

interface PriceTagProps {
  /** The price actually charged, in INR. */
  priceInr: number;
  /**
   * The standing/anchor price, in INR. FALLBACK ONLY — pass `storeAnchor` when
   * you can. This comes from a backend constant, not from the store, so once a
   * store price point or a regional override diverges it is a number we made up
   * sitting next to a real one. It is used only when no store anchor resolved,
   * and only for an INR buyer.
   */
  anchorInr: number;
  /**
   * The same two prices in USD. Used only to render the strike-through anchor
   * for a dollar-currency buyer — the price itself always comes from `store`.
   */
  priceUsd?: number;
  anchorUsd?: number;
  /**
   * What the STORE says this costs, in the buyer's own currency. When present it
   * wins outright: it is literally the string they will be charged. When absent
   * (payments off, offline, product not yet created) the INR props are shown,
   * which is the behaviour that shipped before store pricing existed.
   */
  store?: StorePrice | null;
  /**
   * What the store says the ANCHOR costs — the offer's `anchorTierProductId`
   * looked up the same way `store` is. This is what keeps the "never a
   * fabricated 'was'" promise by construction: the struck number is then a real
   * price of a real product, in the same currency as the one beside it, which
   * also means the discount finally shows outside India and the US instead of
   * being suppressed as a currency mismatch.
   *
   * Optional. Omit it and the INR/USD fallback behaves exactly as it does today.
   */
  storeAnchor?: StorePrice | null;
  /** Optional line under the price, e.g. "Launch offer", "Founder price", "2 months free". */
  note?: string;
  center?: boolean;
  /** Compact form for list rows: smaller type to fit a card header. */
  compact?: boolean;
  /**
   * Dark-on-bright ink for when the tag sits ON a vivid accent fill (e.g. the
   * RecHeroCard). When set, the price/strike/note render in this ink (the strike
   * and note muted) instead of the canvas `primary`/`tertiary` text roles, which
   * would be light and fail AA on a bright fill. Omit on normal dark surfaces.
   */
  ink?: string;
}

/**
 * How far the struck anchor and the note are muted when this tag sits on a vivid
 * accent fill.
 *
 * WAS 0.55, WHICH DID NOT MEET AA. At 12px (`compact`), the on-ink for
 * `accent.info` at 55% composites to roughly #2C5893 over #5B9DF9 — 2.6:1, when
 * normal-size text needs 4.5:1. The lime shop hero was no better at 3.2:1. 0.85
 * clears it on both (≈4.7:1 on info, ≈7.4:1 on lime) and the hierarchy survives
 * intact, because what separates an anchor from a price here was never the
 * opacity: it is four type steps and a line through it.
 */
const ANCHOR_INK_ALPHA = 0.85;

/**
 * The single place the app renders a (possibly slashed) price. Used by the shop
 * list, the program detail, and the paywall so the strikethrough looks identical
 * everywhere and no screen ever hardcodes a price or a fake anchor.
 */
export const PriceTag = ({
  priceInr,
  anchorInr,
  priceUsd,
  anchorUsd,
  store,
  storeAnchor,
  note,
  center,
  compact,
  ink,
}: PriceTagProps) => {
  // One place decides the strings: which currency, and whether an honest anchor
  // exists in it at all. See priceDisplay.ts for why a mismatched-currency
  // strike is suppressed rather than converted, and why a same-currency store
  // anchor is the last word on whether a strike happens.
  const { price, anchor } = resolvePriceDisplay({
    store,
    anchorStore: storeAnchor,
    inr: priceInr,
    usd: priceUsd ?? 0,
    anchorInr,
    anchorUsd,
  });
  // On a bright fill, everything is dark ink — the price at full strength, the
  // strike/note muted. Off a fill, the canvas text roles carry that hierarchy.
  const priceColor = ink ?? "primary";
  const mutedColor = ink ? withAlpha(ink, ANCHOR_INK_ALPHA) : "tertiary";
  return (
    <View style={center ? styles.wrapCenter : undefined}>
      <View style={[styles.row, center && styles.rowCenter]}>
        {anchor ? (
          <Text
            variant={compact ? "caption" : "bodySm"}
            color={mutedColor}
            style={styles.strike}
          >
            {anchor}
          </Text>
        ) : null}
        <Text variant={compact ? "title" : "h2"} color={priceColor}>
          {price}
        </Text>
      </View>
      {note ? (
        <Text variant="caption" color={mutedColor} center={center}>
          {note}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapCenter: { alignItems: "center" },
  row: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: spacing.sm,
  },
  rowCenter: { justifyContent: "center" },
  strike: { textDecorationLine: "line-through" },
});

export default PriceTag;
