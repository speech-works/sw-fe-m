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
 * One-time gate shown before the user's first AI conversation. Deliberately
 * carries no processing detail — the user is about to make an exposure call and
 * does not need a vendor list at that moment; the full disclosure belongs in the
 * privacy policy / T&C. What survives here is the affirmative act: consent is
 * recorded solely via the accept button, and dismissing the sheet (backdrop/back)
 * or tapping "Not now" is a decline.
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
          Ready to take the call?
        </Text>

        <View style={styles.buttons}>
          <Button label="I'm ready" onPress={onAcknowledge} />
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
