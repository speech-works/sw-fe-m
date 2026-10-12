import React from "react";
import { View } from "react-native";
import { Text, radius, spacing, useTheme } from "../../design-system";
import type { ReframePair } from "../../util/packs/reframeReplies";

/**
 * The thoughts and the replies a person kept from a thought step. Always shown
 * as pairs: a short reply on its own ("They may only be listening") does not
 * say what it answers. Used on the finished step, on the thought screen after
 * each Save, and in the week review.
 */
export const SavedReframes: React.FC<{ pairs: ReframePair[] }> = ({ pairs }) => {
  const { colors } = useTheme();
  if (pairs.length === 0) return null;
  return (
    <View style={{ alignSelf: "stretch", gap: spacing.sm }}>
      {pairs.map((p, i) => (
        <View
          key={`${i}:${p.thought}`}
          style={{
            gap: spacing.xs,
            padding: spacing.md,
            borderRadius: radius.card,
            backgroundColor: colors.surface.elevated,
          }}
        >
          <Text variant="label" color="tertiary">
            When you think
          </Text>
          <Text variant="body" color="secondary">
            &quot;{p.thought}&quot;
          </Text>
          <Text variant="label" color="tertiary" style={{ marginTop: spacing.sm }}>
            Your reply
          </Text>
          <Text variant="body" color="primary">
            &quot;{p.reply}&quot;
          </Text>
        </View>
      ))}
    </View>
  );
};
