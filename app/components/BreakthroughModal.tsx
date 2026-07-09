import React from "react";
import { StyleSheet, View } from "react-native";
import {
  AnimatedModal,
  Button,
  Icon,
  IconName,
  icons,
  Text,
  useTheme,
  radius,
  spacing,
} from "../design-system";
import { BreakthroughMetadata } from "../api/forms/types";

interface BreakthroughModalProps {
  visible: boolean;
  data: BreakthroughMetadata | null;
  onClose: () => void;
}

/** Growth-axis → its DS icon (semantic key, one glyph per concept). */
const AXIS_ICONS: Record<string, IconName> = {
  mastery: icons.mastery,
  ease: icons.ease,
  courage: icons.courage,
  confidence: icons.confidence,
  social: icons.social,
};

/**
 * Celebratory "you evolved a dimension" modal — same content grammar as the other
 * dark modals (LowStamina / VitalsFeedback): centred icon disc + eyebrow + h2, a
 * body message, gap-driven spacing, a stacked full-width CTA, and no redundant
 * close X (the "Acknowledged" button and a backdrop tap both dismiss). Reflection
 * accent (purple) carries the icon disc, delta chip, and CTA (AA-correct `accentOn`
 * ink on the fill). Rides the DS `AnimatedModal` (dark scrim + 0.96→1 scale).
 */
export const BreakthroughModal: React.FC<BreakthroughModalProps> = ({
  visible,
  data,
  onClose,
}) => {
  const { colors } = useTheme();
  if (!data) return null;

  const accent = colors.accent.purple;
  const onAccent = colors.accentOn.purple;
  const axisIcon = AXIS_ICONS[data.axis] ?? icons.proud;
  const axisTitle = data.axis.charAt(0).toUpperCase() + data.axis.slice(1);

  return (
    <AnimatedModal visible={visible} onClose={onClose} maxWidth={380}>
      <View style={styles.content}>
        <View style={[styles.iconDisc, { backgroundColor: accent }]}>
          <Icon name={axisIcon} size={30} color={onAccent} />
        </View>

        <Text variant="label" color="secondary" center>
          Breakthrough Detected
        </Text>
        <Text variant="h2" color="primary" center>
          {axisTitle} Evolved
        </Text>

        <View style={[styles.deltaChip, { backgroundColor: accent }]}>
          <Text variant="title" color={onAccent}>
            +{data.delta} Points
          </Text>
        </View>

        <Text variant="body" color="secondary" center style={styles.message}>
          {data.message}
        </Text>

        <View
          style={[styles.scoreRow, { borderTopColor: colors.border.hairline }]}
        >
          <Text variant="bodySm" color="secondary">
            New Score
          </Text>
          <Text variant="h3" color="primary">
            {data.newScore}
          </Text>
        </View>

        <View style={styles.actions}>
          <Button
            label="Acknowledged"
            accentColor={accent}
            onAccentColor={onAccent}
            onPress={onClose}
          />
        </View>
      </View>
    </AnimatedModal>
  );
};

export default BreakthroughModal;

const styles = StyleSheet.create({
  // Centred, gap-driven stack — the shared dark-modal content grammar.
  content: {
    alignItems: "center",
    gap: spacing.md,
  },
  iconDisc: {
    width: 64,
    height: 64,
    borderRadius: radius.input,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  deltaChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  message: {
    lineHeight: 22,
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
  actions: {
    width: "100%",
    marginTop: spacing.xs,
  },
});
