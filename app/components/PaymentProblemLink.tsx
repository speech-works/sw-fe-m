import React, { useState } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import * as Application from "expo-application";
import { Text, spacing } from "../design-system";
import { useUserStore } from "../stores/user";
import {
  PAYMENT_PROBLEM_LINK_LABEL,
  openPaymentProblemEmail,
} from "../util/functions/paymentProblem";

/** Caption-sized link, so it needs help reaching a 44pt target. */
const HIT_SLOP = { top: 10, bottom: 10, left: 8, right: 8 };

export interface PaymentProblemLinkProps {
  /** The program or product they were buying, when known. */
  product?: string | null;
  /** Override the text colour, for the dark plan screen. */
  color?: React.ComponentProps<typeof Text>["color"];
}

/**
 * "Problem with a payment?" A quiet link that opens an email to support with
 * the details we need to find the payment (see util/functions/paymentProblem).
 *
 * When no mail app can take it, the details are copied and the line saying so
 * shows right here, inline. Never a bottom sheet: two of the three hosts are
 * themselves native modals, and a second one over them freezes touches on iOS.
 */
export const PaymentProblemLink: React.FC<PaymentProblemLinkProps> = ({
  product,
  color = "tertiary",
}) => {
  const userId = useUserStore((s) => s.user?.id ?? null);
  const [notice, setNotice] = useState<string | null>(null);

  const onPress = async () => {
    setNotice(null);
    const fallback = await openPaymentProblemEmail({
      userId,
      platformOS: Platform.OS,
      osVersion: Platform.Version,
      appVersion: Application.nativeApplicationVersion,
      buildNumber: Application.nativeBuildVersion,
      product: product ?? null,
      now: new Date(),
    });
    setNotice(fallback);
  };

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={() => void onPress()}
        hitSlop={HIT_SLOP}
        accessibilityRole="link"
        accessibilityLabel={PAYMENT_PROBLEM_LINK_LABEL}
      >
        <Text variant="caption" color={color} center style={styles.link}>
          {PAYMENT_PROBLEM_LINK_LABEL}
        </Text>
      </Pressable>
      {notice ? (
        <Text variant="caption" color={color} center>
          {notice}
        </Text>
      ) : null}
    </View>
  );
};

export default PaymentProblemLink;

const styles = StyleSheet.create({
  wrap: { alignItems: "center", gap: spacing.xs },
  link: { textDecorationLine: "underline" },
});
