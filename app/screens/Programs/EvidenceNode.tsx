import React from "react";
import { StyleSheet, View } from "react-native";
import PressableScale from "../../components/PressableScale";
import {
  Icon,
  icons,
  radius,
  size,
  spacing,
  Surface,
  Text,
  useTheme,
} from "../../design-system";

/**
 * The one link out to a program's research, in the pre-purchase sales flow.
 *
 * WHY BEFORE THE PURCHASE AND NOT AFTER. A buyer weighing ₹999 is the only
 * reader who has a use for this. Somebody who already owns the program has the
 * honesty in front of them every day, inside the teaching. Sited after the
 * sale, the screen answers a question nobody is still asking.
 *
 * WHY IT IS HERE AND NOT INSIDE A DAY. The obvious place for a source is next
 * to the claim it supports, and that was the first design. Three of this
 * product's own rules say no: one thing per day, ten minutes a day, and under
 * 4% of people are still opening the app at day 15. Anything extra on a
 * teaching screen costs more than it gives. Most of these papers are also
 * paywalled, so a tap that lands on a payment page costs more trust than it
 * builds.
 *
 * The honesty is already in the teaching copy, where it is free and needs no
 * tap: "338 listeners rated ten things", "no trial with a comparison group
 * behind it", "measured on students rather than on daters". This card is proof
 * for the minority who want to check, sited where nobody is mid-task.
 *
 * THE WORDING IS DELIBERATE. It is the question the reader is already asking,
 * printed back at them, rather than a claim about how rigorous we are. And it
 * names the weakest source before a sceptic can find it, which is the part no
 * competitor can copy without doing the work.
 */
export default function EvidenceCard({
  claimCount,
  hasThinClaim,
  onPress,
}: {
  /** From ProgramEvidenceSummary.claimCount. Never hardcode it: it differs per program. */
  claimCount: number;
  /**
   * True when any claim is WEAK, CONTESTED or ABSENT.
   *
   * Derive it from the summary rather than assuming: most programs have one,
   * but a program whose claims are all STRONG must not offer to show a weak
   * one, and the sentence changes when it does not have one.
   */
  hasThinClaim: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();

  if (claimCount === 0) return null;

  const studies = claimCount === 1 ? "One study" : `${claimCount} studies`;
  const body = hasThinClaim
    ? `${studies}. We show you the shaky one too.`
    : `${studies} behind this program. Read them yourself.`;

  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Is this based on anything? ${body}`}
      accessibilityHint="Opens the research behind this program"
    >
      <Surface bordered rounded="card" padded={spacing.lg}>
        <View style={styles.row}>
          <Icon
            name={icons.checklist}
            size={size.iconInline}
            color={colors.text.secondary}
          />
          <View style={styles.copy}>
            <Text variant="label">Is this based on anything?</Text>
            <Text variant="bodySm" color="secondary" style={styles.body}>
              {body}
            </Text>
          </View>
          <Icon
            name={icons.chevronRight}
            size={size.iconInline}
            color={colors.text.tertiary}
          />
        </View>
      </Surface>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  copy: {
    flex: 1,
    gap: spacing.xs,
  },
  body: {
    // The card grows to fit. A clipped honesty line is worse than a tall card.
    flexShrink: 1,
  },
});

export const EVIDENCE_CARD_RADIUS = radius.card;
