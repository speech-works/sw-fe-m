import React from "react";
import { View, StyleSheet } from "react-native";
import { Text, spacing, withAlpha } from "../design-system";

interface PriceTagProps {
  /** The price actually charged, in INR. */
  priceInr: number;
  /**
   * The standing/anchor price, in INR. When higher than `priceInr` it is struck
   * through (a founder or launch-offer discount); when equal, only the price
   * shows. Always a real server-supplied price — never a fabricated "was".
   */
  anchorInr: number;
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
 * The single place the app renders a (possibly slashed) price. Used by the shop
 * list, the program detail, and the paywall so the strikethrough looks identical
 * everywhere and no screen ever hardcodes a price or a fake anchor.
 */
export const PriceTag = ({
  priceInr,
  anchorInr,
  note,
  center,
  compact,
  ink,
}: PriceTagProps) => {
  const discounted = anchorInr > priceInr;
  // On a bright fill, everything is dark ink — the price at full strength, the
  // strike/note muted. Off a fill, the canvas text roles carry that hierarchy.
  const priceColor = ink ?? "primary";
  const mutedColor = ink ? withAlpha(ink, 0.55) : "tertiary";
  return (
    <View style={center ? styles.wrapCenter : undefined}>
      <View style={[styles.row, center && styles.rowCenter]}>
        {discounted ? (
          <Text
            variant={compact ? "caption" : "bodySm"}
            color={mutedColor}
            style={styles.strike}
          >
            ₹{anchorInr}
          </Text>
        ) : null}
        <Text variant={compact ? "title" : "h2"} color={priceColor}>
          ₹{priceInr}
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
