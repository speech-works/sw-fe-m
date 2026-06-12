import React from "react";
import { StyleSheet, Text, View } from "react-native";
import BottomSheetModal from "./BottomSheetModal";
import Button from "./Button";
import { theme } from "../Theme/tokens";
import { parseTextStyle } from "../util/functions/parseStyles";

interface IRLConfirmationModalProps {
  /**
   * Whether the modal is currently visible.
   */
  visible: boolean;
  /**
   * Function to be called when the user wants to dismiss or cancel.
   */
  onClose: () => void;
  /**
   * Function to be called when the user confirms they've done the activity IRL.
   */
  onConfirm: () => void;
}

/**
 * A specialized bottom-sheet modal designed to prompt users to confirm
 * they have actually completed a real-life challenge before proceeding
 * to the reflection and logging phase.
 *
 * Framed in an SLP-friendly and PWS-friendly way.
 */
const IRLConfirmationModal: React.FC<IRLConfirmationModalProps> = ({
  visible,
  onClose,
  onConfirm,
}) => {
  return (
    <BottomSheetModal
      visible={visible}
      onClose={onClose}
      fitContent
      showHandle
      hasBottomSafePadding
    >
      <View style={styles.container}>
        <Text style={styles.title}>Ready to reflect? ✨</Text>
        <Text style={styles.body}>
          Wonderful intention! Before we dive into the reflection, have you
          already had a chance to try this activity out in the real world?
        </Text>

        <View style={styles.buttonContainer}>
          <Button
            text="Yes, log my experience"
            onPress={onConfirm}
            variant="normal"
            style={styles.primaryButton}
          />
          <Button
            text="Nope! Let me do this"
            onPress={onClose}
            variant="ghost"
            style={styles.secondaryButton}
            textColor={theme.colors.library.gray[400]}
          />
        </View>
      </View>
    </BottomSheetModal>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 24,
    paddingTop: 40,
    alignItems: "center",
  },
  title: {
    ...parseTextStyle(theme.typography.Heading2),
    color: theme.colors.text.title,
    textAlign: "center",
    marginBottom: 16,
    fontWeight: "800",
  },
  body: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 24,
    opacity: 0.9,
  },
  buttonContainer: {
    width: "100%",
    gap: 8,
  },
  primaryButton: {
    width: "100%",
    borderRadius: 16, // Consistent with Academy buttons
  },
  secondaryButton: {
    width: "100%",
    borderWidth: 0,
  },
});

export default IRLConfirmationModal;
