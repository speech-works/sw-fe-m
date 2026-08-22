import React from "react";
import { StyleSheet, View } from "react-native";
import PressableScale from "../../../components/PressableScale";
import {
  Text,
  TextLink,
  haptics,
  primaryEdge,
  radius,
  space,
  spacing,
  useTheme,
} from "../../../design-system";
import { ASK_COPY } from "./copy";
import { pickNext } from "./draft";

/**
 * STEP 2: the user puts their own answers in order.
 *
 * ── WE NEVER COMPUTE THIS ──────────────────────────────────────────────────
 * No difficulty score, no ranking model, no "we suggest starting here". The
 * order is the one piece of judgement only they can make: which call is the
 * easy one, which person they would tell first. A computed order would be a
 * guess dressed as advice, and it would be wrong often enough to matter.
 *
 * ── THE LAST ONE NEEDS NO TAP ──────────────────────────────────────────────
 * With three answers, two taps decide all three. Asking for a third tap on the
 * only remaining option is asking somebody to confirm arithmetic.
 */
export function StepOrder({
  prompt,
  answers,
  order,
  onChange,
}: {
  prompt: string;
  /** The nouns from step 1, in the order they were typed. */
  answers: string[];
  /** Indexes into `answers`, in the user's chosen order. */
  order: number[];
  onChange: (next: number[]) => void;
}) {
  const { colors } = useTheme();

  const pick = (index: number) => {
    if (order.includes(index)) return;
    haptics.light();
    // The rule, including "the last one needs no tap", is in draft.ts.
    onChange(pickNext(order, index, answers.length));
  };

  return (
    <View style={styles.root}>
      <Text variant="h2" color="primary">
        {prompt}
      </Text>
      <Text variant="bodySm" color="secondary">
        {ASK_COPY.order.help}
      </Text>

      <View style={styles.list}>
        {answers.map((answer, i) => {
          const position = order.indexOf(i);
          const picked = position !== -1;
          return (
            <PressableScale key={i} onPress={() => pick(i)} disabled={picked}>
              <View
                style={[
                  styles.row,
                  {
                    backgroundColor: picked
                      ? colors.action.primary
                      : colors.surface.control,
                  },
                  // Only the picked row is a bright fill. The unpicked one is a
                  // neutral control surface and carries its own boundary.
                  //
                  // NOTE the ternary above hides this fill from the grep in
                  // paperEdges.test.ts, which only sees a direct
                  // `backgroundColor: colors.action.primary`. The rule still
                  // applies; the scanner just cannot see it.
                  picked ? primaryEdge(colors) : null,
                ]}
              >
                <View
                  style={[
                    styles.number,
                    {
                      backgroundColor: picked
                        ? colors.action.onPrimary
                        : "transparent",
                      borderColor: picked
                        ? "transparent"
                        : colors.border.default,
                    },
                  ]}
                >
                  <Text
                    variant="label"
                    color={picked ? "primary" : "tertiary"}
                    style={
                      picked ? { color: colors.action.primary } : undefined
                    }
                  >
                    {picked ? String(position + 1) : ""}
                  </Text>
                </View>
                <Text
                  variant="body"
                  style={{
                    flex: 1,
                    color: picked
                      ? colors.action.onPrimary
                      : colors.text.primary,
                  }}
                >
                  {answer}
                </Text>
              </View>
            </PressableScale>
          );
        })}
      </View>

      {order.length > 0 && (
        <TextLink label={ASK_COPY.order.reset} onPress={() => onChange([])} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.sm },
  list: { gap: space.rowGap, marginTop: spacing.md },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.iconText,
    padding: space.cardPad,
    borderRadius: radius.input,
  },
  number: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
