import React from "react";
import { StyleSheet, View } from "react-native";

import {
  Text,
  useTheme,
  space,
  spacing,
  radius,
  fonts,
  withAlpha,
} from "../../design-system";
import type { DiscoveryTag } from "../../api/buddies";

/**
 * One question, and what somebody answered, as a small labelled card.
 *
 * WHY PILLS AND NOT THE DS `Chip`. A `Chip` is 36pt tall and carries a
 * selected/unselected affordance, so three of them read as a control group you
 * are meant to operate. Nothing here is pressable. These are 28pt, and they
 * mark the shared one with a DOT rather than an outline — an outlined pill at
 * this size is a button, which is the exact mistake the first version of this
 * sheet made.
 *
 * THE LABEL IS NOT DECORATION. "Presenting" is a situation somebody practises
 * and "Feeling calmer" is an outcome they want. Rendered as one undifferentiated
 * row of pills, which is how this started, neither means anything to a stranger:
 * the person who picked them saw the question above the picker and the person
 * reading the card never did.
 */
export interface TagGroupProps {
  label: string;
  tags: DiscoveryTag[];
}

export const TagGroup: React.FC<TagGroupProps> = ({ label, tags }) => {
  const { colors } = useTheme();
  if (tags.length === 0) return null;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface.inset, borderColor: colors.border.hairline },
      ]}
    >
      <Text variant="eyebrow" color="disabled" style={styles.label}>
        {label}
      </Text>
      <View style={styles.pills}>
        {tags.map((t) => (
          <View
            key={t.id}
            style={[
              styles.pill,
              t.shared
                ? {
                    backgroundColor: withAlpha(colors.action.primary, 0.12),
                    borderColor: withAlpha(colors.action.primary, 0.32),
                  }
                : { backgroundColor: colors.surface.control, borderColor: "transparent" },
            ]}
          >
            <View
              style={[
                styles.dot,
                {
                  backgroundColor: t.shared
                    ? colors.text.accent
                    : colors.text.tertiary,
                },
              ]}
            />
            {/* `text.accent`, not the action fill. Both are orange on the dark
                scheme, but the fill measures 2.02:1 as TEXT on paper. */}
            <Text
              variant="caption"
              color={t.shared ? "accent" : "secondary"}
              style={t.shared ? styles.sharedLabel : undefined}
            >
              {t.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

export default TagGroup;

const styles = StyleSheet.create({
  card: {
    marginTop: space.rowGap,
    borderWidth: 1,
    borderRadius: radius.card,
    padding: space.rowGap,
  },
  label: { marginBottom: spacing.sm },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    // Deliberately short of the DS `Chip`'s 36: this is a label, not a control.
    minHeight: 28,
    paddingHorizontal: space.iconText,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  // Carries the shared state alongside colour, so it survives a reader who
  // cannot separate the two hues.
  dot: { width: 6, height: 6, borderRadius: radius.full },
  sharedLabel: { fontFamily: fonts.semibold },
});
