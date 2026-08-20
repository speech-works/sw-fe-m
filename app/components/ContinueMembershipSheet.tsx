import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import PressableScale from "./PressableScale";
import { Sheet, Text, Button, spacing, useTheme } from "../design-system";
import { useUserStore } from "../stores/user";
import { useEventStore } from "../stores/events";
import { EVENT_NAMES } from "../stores/events/constants";
import { purchasesAvailable } from "../services/purchases";
import { membershipEndingSoon, membershipEndsAt } from "../util/functions/membership";
import { useMembershipPrice } from "../hooks/useMembershipPrice";
import { canAskForMembership, recordMembershipAsk } from "../services/membershipAsk";

/**
 * ===========================================================================
 * DAY 28
 * ---------------------------------------------------------------------------
 * Buying a pack grants thirty free days of full membership. On day thirty one
 * it stops. Nobody is told, at any point, and the app never mentions it.
 *
 * That person chose to pay, then used the whole product for a month. They are
 * the warmest audience this app will ever have, and the only thing standing
 * between them and continuing is that we never asked.
 *
 * ── WHY THIS IS NOT A PAYWALL ──────────────────────────────────────────────
 * Nothing is being taken away and nothing is blocked. It is a deadline they
 * already have, said out loud, next to what they did with the month. The
 * dismissal is a real choice with a real label, not a greyed-out corner.
 *
 * ── WHY IT SHOWS THEIR OWN NUMBERS ─────────────────────────────────────────
 * "Seventeen days of practice" is a fact about them, not a claim about the
 * product, and it is the strongest thing on the screen. It is also the only
 * honest form of proof this app has: nothing here says their speech improved,
 * because nothing measures that.
 *
 * ── WHO NEVER SEES IT ──────────────────────────────────────────────────────
 * Store subscribers. Their membership renews on its own, so a warning would
 * read as a cancellation notice and cause the churn it meant to prevent. See
 * membershipEndingSoon.
 * ===========================================================================
 */

export interface ContinueMembershipSheetProps {
  /** Days practised during the free month, when known. Omit rather than guess. */
  daysPractised?: number | null;
}

export const ContinueMembershipSheet: React.FC<ContinueMembershipSheetProps> = ({
  daysPractised,
}) => {
  const { colors } = useTheme();
  const { emit } = useEventStore();
  const user = useUserStore((s) => s.user);
  const price = useMembershipPrice();

  const [visible, setVisible] = useState(false);
  const [decided, setDecided] = useState(false);

  const due = purchasesAvailable() && membershipEndingSoon(user);

  useEffect(() => {
    if (!due || decided) return;

    let cancelled = false;
    void (async () => {
      // Shares the one-ask-a-week limit with every other surface. A person who
      // saw the dock after yesterday's session does not need this today.
      const ok = await canAskForMembership();
      if (cancelled) return;
      setDecided(true);
      if (ok) {
        setVisible(true);
        void recordMembershipAsk();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [due, decided]);

  if (!due) return null;

  const endsAt = membershipEndsAt(user);
  const days = user?.membership?.daysRemaining ?? 0;

  // "ends today" and "ends tomorrow" read as facts. "ends in 0 days" reads as a
  // bug, and the count is already in the user's own calendar so these are true.
  const whenLabel =
    days <= 0 ? "ends today" : days === 1 ? "ends tomorrow" : `ends in ${days} days`;

  return (
    <Sheet visible={visible} onClose={() => setVisible(false)}>
      <View style={styles.content}>
        <Text variant="eyebrow" color={colors.accent.warning} center>
          Your free month {whenLabel}
        </Text>

        <Text variant="h2" color="primary" center style={styles.title}>
          {daysPractised != null && daysPractised > 0
            ? `You practised on ${daysPractised} days.`
            : "Keep what you have been using."}
        </Text>

        <Text variant="body" color="secondary" center style={styles.body}>
          {/* No claim about their speech. Only what they did, and what stops. */}
          Membership is what has been giving you the longer calls and the whole
          technique library. Keep it for {price.annualPerMonthLabel} a month.
        </Text>

        <View style={styles.actions}>
          <Button
            label="Keep my access"
            onPress={() => {
              setVisible(false);
              emit(EVENT_NAMES.SHOW_PREMIUM_UPSELL);
            }}
            accentColor={colors.accent.warning}
            onAccentColor={colors.accentOn.warning}
          />
        </View>

        <PressableScale
          onPress={() => setVisible(false)}
          accessibilityRole="button"
          accessibilityLabel="Not now"
          style={styles.dismiss}
        >
          <Text variant="caption" color="tertiary">
            Not now
          </Text>
        </PressableScale>

        {/* The reassurance that makes the rest credible. A pack is bought once
            and owned forever, so this is simply true, and it is the first thing
            somebody in this position worries about. */}
        <Text variant="caption" color="tertiary" center style={styles.footnote}>
          The program you bought stays yours either way.
          {endsAt ? ` Access ends ${endsAt.toLocaleDateString()}.` : ""}
        </Text>
      </View>
    </Sheet>
  );
};

export default ContinueMembershipSheet;

const styles = StyleSheet.create({
  content: { alignItems: "center", paddingTop: spacing.sm },
  title: { marginTop: spacing.sm, marginBottom: spacing.sm },
  body: { lineHeight: 24 },
  actions: { width: "100%", marginTop: spacing["2xl"] },
  dismiss: { marginTop: spacing.lg, paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  footnote: { marginTop: spacing.md },
});
