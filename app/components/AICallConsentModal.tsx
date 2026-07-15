import React from "react";
import { StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  Sheet,
  Text,
  Button,
  useTheme,
  radius,
  spacing,
} from "../design-system";

interface AICallConsentModalProps {
  visible: boolean;
  /** Called ONLY when the user taps the explicit accept button — caller persists consent + proceeds. */
  onAcknowledge: () => void;
  /**
   * Called when the user declines — taps "Not now" OR dismisses the sheet
   * (backdrop tap / Android back). Consent must be an affirmative act, so a
   * dismissal is a decline, never an implied "yes". The caller should take the
   * user out of the AI-call flow (e.g. navigate back).
   */
  onDecline: () => void;
}

/**
 * One-time disclosure shown before the user's first AI conversation, explaining
 * that their voice is streamed to third-party AI providers during the call.
 * Consent is affirmative-only: it is recorded solely via the accept button;
 * dismissing the sheet (backdrop/back) or tapping "Not now" is a decline.
 */
export const AICallConsentModal: React.FC<AICallConsentModalProps> = ({
  visible,
  onAcknowledge,
  onDecline,
}) => {
  const { colors } = useTheme();

  return (
    <Sheet visible={visible} onClose={onDecline}>
      <View style={styles.container}>
        <View style={[styles.iconDisc, { backgroundColor: colors.action.primaryTint }]}>
          <MaterialCommunityIcons
            name="account-voice"
            size={28}
            color={colors.text.accent}
          />
        </View>

        <Text variant="h2" center>
          Before your first AI conversation
        </Text>
        <Text variant="bodySm" color="secondary" center>
          Your voice is streamed in real time to our AI providers — Deepgram
          transcribes your speech, and Groq generates the AI's responses — so
          it can have a conversation with you during the call. It's used only
          for this practice session; you can end the call anytime.
        </Text>

        <View style={styles.buttons}>
          <Button label="I agree — let's start" onPress={onAcknowledge} />
          <Button label="Not now" variant="ghost" onPress={onDecline} />
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

export default AICallConsentModal;
