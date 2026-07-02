import React from "react";
import { StyleSheet, View } from "react-native";
import { ToolType } from "../api/tools/types";
import {
  Sheet,
  useTheme,
  spacing,
  radius,
  Text,
  Button,
  Icon,
  icons,
  type IconName,
} from "../design-system";

interface ToolConsentCopy {
  icon: IconName;
  title: string;
  body: string;
}

/**
 * One-time educational copy per monitored tool. DAF / Chorus are
 * fluency-inducing aids; the message frames them as companions, never
 * forbidden ("your voice is enough").
 */
const CONSENT_COPY: Partial<Record<ToolType, ToolConsentCopy>> = {
  [ToolType.DAF]: {
    icon: icons.headphones,
    title: "About Delayed Auditory Feedback (DAF)",
    body:
      "DAF can make speech feel smoother by playing back your voice with a slight delay. Many people find it helpful in practice sessions.\n\n" +
      "Research shows DAF works best as a companion to other techniques — not as a standalone solution. Its effect can diminish with extended use.\n\n" +
      "It's always okay to practice without it. Your voice is enough.",
  },
  [ToolType.CHORUS]: {
    icon: icons.voiceTool,
    title: "About the Guide",
    body:
      "The Guide plays a gentle second voice alongside yours, which can make speech feel smoother. Many people find it helpful in practice.\n\n" +
      "Like other fluency aids, it works best as a companion to other techniques — not on its own — and its effect can fade with heavy use.\n\n" +
      "It's always okay to practice without it. Your voice is enough.",
  },
};

interface ToolConsentModalProps {
  visible: boolean;
  tool: ToolType | null;
  /** Called when the user taps "Got it" — caller should persist consent and
   *  then proceed with activating the tool. */
  onAcknowledge: () => void;
}

export const ToolConsentModal: React.FC<ToolConsentModalProps> = ({
  visible,
  tool,
  onAcknowledge,
}) => {
  const { colors } = useTheme();
  const copy = tool ? CONSENT_COPY[tool] : undefined;
  if (!copy) return null;

  return (
    <Sheet visible={visible} onClose={onAcknowledge}>
      <View style={styles.container}>
        <View style={[styles.iconDisc, { backgroundColor: colors.accentTint.success }]}>
          <Icon name={copy.icon} size={28} color={colors.accent.success} />
        </View>

        <Text variant="h2" center>
          {copy.title}
        </Text>
        <Text variant="body" center color="secondary">
          {copy.body}
        </Text>

        <View style={styles.buttons}>
          <Button label="Got it — let's go" onPress={onAcknowledge} />
        </View>
      </View>
    </Sheet>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
  iconDisc: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  buttons: {
    width: "100%",
    gap: spacing.md,
    marginTop: spacing.xs,
  },
});

export default ToolConsentModal;
