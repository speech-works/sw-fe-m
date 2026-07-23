import React from "react";
import { View, StyleSheet } from "react-native";
import { Text, spacing } from "../design-system";

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
}: PriceTagProps) => {
  const discounted = anchorInr > priceInr;
  return (
    <View style={center ? styles.wrapCenter : undefined}>
      <View style={[styles.row, center && styles.rowCenter]}>
        {discounted ? (
          <Text
            variant={compact ? "caption" : "bodySm"}
            color="tertiary"
            style={styles.strike}
          >
            ₹{anchorInr}
          </Text>
        ) : null}
        <Text variant={compact ? "title" : "h2"} color="primary">
          ₹{priceInr}
        </Text>
      </View>
      {note ? (
        <Text variant="caption" color="tertiary" center={center}>
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
