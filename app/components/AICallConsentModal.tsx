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
  /** Called when the user taps "Got it" — caller persists consent + proceeds. */
  onAcknowledge: () => void;
}

/**
 * One-time disclosure shown before the user's first AI conversation, explaining
 * that their voice is streamed to a third-party AI partner during the call.
 * On the design-system `Sheet` (dark, grab handle, backdrop-tap dismiss, no X).
 */
export const AICallConsentModal: React.FC<AICallConsentModalProps> = ({
  visible,
  onAcknowledge,
}) => {
  const { colors } = useTheme();

  return (
    <Sheet visible={visible} onClose={onAcknowledge}>
      <View style={styles.container}>
        <View style={[styles.iconDisc, { backgroundColor: colors.action.primaryTint }]}>
          <MaterialCommunityIcons
            name="account-voice"
            size={28}
            color={colors.action.primary}
          />
        </View>

        <Text variant="h2" center>
          Before your first AI conversation
        </Text>
        <Text variant="bodySm" color="secondary" center>
          Your voice is streamed in real time to our AI partner so it can respond
          to you and transcribe your speech during the call. It is used only for
          this practice session and is not saved on your device — you can end the
          call anytime.
        </Text>

        <View style={styles.buttons}>
          <Button label="Got it — let's start" onPress={onAcknowledge} />
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
