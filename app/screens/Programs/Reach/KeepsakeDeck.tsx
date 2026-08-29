import React from "react";
import { StyleSheet, View } from "react-native";
import { Keepsake } from "../../../api/keepsakes/types";
import {
  Card,
  Carousel,
  Divider,
  Text,
  space,
  spacing,
} from "../../../design-system";

/**
 * The cards a user is holding, one per finished program.
 *
 * A swipeable deck rather than a list, because these are not entries in a log.
 * Each one is a single object the user made, and the whole point of the screen
 * is that it hands them back rather than summarising them.
 *
 * NOTHING IS SCORED HERE, for the same reason nothing is scored on the goals
 * half of this screen. These are personal notes: their line, their plan, their
 * routine. A card with a number on it stops being theirs.
 */
export function KeepsakeDeck({ keepsakes }: { keepsakes: Keepsake[] }) {
  return (
    <Carousel
      data={keepsakes}
      keyExtractor={(k) => k.formKey}
      bleedRight={space.screenX}
      dots
      renderItem={({ item: keepsake }) => (
        <Card style={styles.card}>
          {keepsake.packTitle ? (
            <Text variant="caption" color="tertiary">
              {keepsake.packTitle}
            </Text>
          ) : null}
          <Text variant="h3" color="primary">
            {keepsake.title}
          </Text>

          <Divider />

          {keepsake.answers.map((answer, i) => (
            <View key={`${keepsake.formKey}-${i}`} style={styles.answer}>
              {/* The question is kept with the answer, exactly as the goals
                  half of this screen keeps it: months later "at a counter"
                  means nothing without "where would you use it?" above it. */}
              <Text variant="caption" color="tertiary">
                {answer.label}
              </Text>
              <Text variant="body" color="primary">
                {answer.value}
              </Text>
            </View>
          ))}
        </Card>
      )}
    />
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  answer: { gap: spacing.xxs },
});
