import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import { Text, space } from "../design-system";
import {
  OTHER_ACCOUNT_TITLE,
  otherAccountLine,
} from "../services/purchaseSettlement";

export interface OtherAccountNoticeProps {
  /** The heading's size, to match the host: "title" on a page, "h2" in a sheet. */
  headingVariant?: "title" | "h2";
  /** Centre both lines, for the plan screen's centred footer. */
  center?: boolean;
}

/**
 * "Paid on your other account". The final state of a purchase the server keeps
 * with another Speechworks account on the same Apple or Google Play account.
 *
 * One component for every purchase surface (program page, plan screen, out of
 * calls sheet), so the words cannot drift apart. It says nothing about
 * unlocking on its own, because nothing will. Each host keeps its own
 * "Problem with a payment?" link below it and shows no Buy or "Check again".
 */
export const OtherAccountNotice: React.FC<OtherAccountNoticeProps> = ({
  headingVariant = "h2",
  center = false,
}) => (
  <View style={styles.block} accessibilityRole="summary">
    <Text variant={headingVariant} color="primary" center={center}>
      {OTHER_ACCOUNT_TITLE}
    </Text>
    <Text variant="body" color="secondary" center={center}>
      {otherAccountLine(Platform.OS)}
    </Text>
  </View>
);

export default OtherAccountNotice;

const styles = StyleSheet.create({
  block: { gap: space.titleSub },
});
