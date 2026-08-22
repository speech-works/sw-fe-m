import React from "react";
import { StyleSheet, View } from "react-native";
import {
  Button,
  Icon,
  Text,
  icons,
  radius,
  space,
  spacing,
  useTheme,
} from "../../../design-system";

/**
 * REACH, BEFORE THERE IS ANY.
 *
 * ── WHAT IT DOES NOT SAY ───────────────────────────────────────────────────
 * No promise, no outcome, no "people who use this do X". We do not have that
 * evidence, and a person who stutters has met enough of it. Everything here is
 * a description of a mechanism they can check for themselves the moment they
 * start a program.
 *
 * ── THE EXAMPLE IS LABELLED AS ONE ─────────────────────────────────────────
 * The preview shows three lines in somebody else's words. It carries "An
 * example" above it and sits at reduced contrast, because a made-up record
 * styled to look like a real one is the single worst thing this screen could
 * do to somebody who has not started yet.
 */
export function LockedState({ onBrowse }: { onBrowse: () => void }) {
  const { colors } = useTheme();

  const examples = [
    "Call the landlord about the deposit",
    "Tell Priya I stutter",
    "Ask a question in the Monday standup",
  ];

  return (
    <View style={styles.root}>
      <Text variant="body" color="secondary">
        Every program starts by asking what you want to do outside the app. You
        write it in your own words, and the program will not finish until you
        say what happened.
      </Text>
      <Text variant="body" color="secondary">
        Those answers stay here.
      </Text>

      <Text variant="caption" color="tertiary" style={styles.exampleLabel}>
        An example
      </Text>

      <View
        style={[
          styles.preview,
          {
            backgroundColor: colors.surface.control,
            borderColor: colors.border.default,
          },
        ]}
      >
        {examples.map((line) => (
          <View key={line} style={styles.row}>
            <Icon name={icons.success} size={16} color={colors.text.tertiary} />
            <Text variant="bodySm" color="tertiary" style={styles.flex}>
              {line}
            </Text>
          </View>
        ))}
      </View>

      <Button label="See programs" variant="primary" onPress={onBrowse} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.rowGap },
  flex: { flex: 1 },
  exampleLabel: { marginTop: spacing.md },
  preview: {
    gap: spacing.md,
    padding: space.cardPad,
    borderRadius: radius.card,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  row: { flexDirection: "row", alignItems: "center", gap: space.inlineGap },
});
