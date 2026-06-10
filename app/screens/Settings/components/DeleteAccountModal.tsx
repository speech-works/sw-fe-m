import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import BottomSheetModal from "../../../components/BottomSheetModal";
import Button from "../../../components/Button";
import { theme } from "../../../Theme/tokens";
import { parseTextStyle } from "../../../util/functions/parseStyles";

const CONFIRM_WORD = "DELETE";
const DANGER = "#DC2626";

interface DeleteAccountModalProps {
  visible: boolean;
  onClose: () => void;
  /**
   * Performs the actual deletion. Should reject if the server deletion fails so
   * this modal can surface an error and keep the user on screen to retry.
   */
  onConfirm: () => Promise<void>;
}

/**
 * Destructive confirmation for permanent account deletion. Requires the user to
 * type DELETE to guard against accidental taps, and clearly states that the
 * action is irreversible and what data is removed.
 */
const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({
  visible,
  onClose,
  onConfirm,
}) => {
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset transient state whenever the sheet is opened or closed.
  useEffect(() => {
    if (!visible) {
      setConfirmText("");
      setError(null);
      setIsDeleting(false);
    }
  }, [visible]);

  const canDelete = confirmText.trim().toUpperCase() === CONFIRM_WORD;

  const handleDelete = async () => {
    if (!canDelete || isDeleting) return;
    setError(null);
    setIsDeleting(true);
    try {
      await onConfirm();
      // On success the auth state is cleared, which unmounts this screen and
      // routes to login. Intentionally no state updates after this point.
    } catch (e) {
      setIsDeleting(false);
      setError(
        "We couldn't delete your account. Please check your connection and try again.",
      );
    }
  };

  return (
    <BottomSheetModal
      visible={visible}
      onClose={isDeleting ? () => {} : onClose}
      fitContent
      showHandle
      hasBottomSafePadding
    >
      <View style={styles.container}>
        <View style={styles.watermark} pointerEvents="none">
          <MaterialCommunityIcons
            name="alert-octagon"
            size={160}
            color={DANGER}
          />
        </View>

        <Text style={styles.title}>Delete your account?</Text>
        <Text style={styles.body}>
          This permanently deletes your account and all of your data, including
          your practice recordings, progress, assessments, and history. This
          cannot be undone.
        </Text>

        <View style={styles.confirmBlock}>
          <Text style={styles.confirmLabel}>
            Type <Text style={styles.confirmWord}>{CONFIRM_WORD}</Text> to confirm
          </Text>
          <TextInput
            value={confirmText}
            onChangeText={setConfirmText}
            autoCapitalize="characters"
            autoCorrect={false}
            editable={!isDeleting}
            placeholder={CONFIRM_WORD}
            placeholderTextColor={theme.colors.library.gray[300]}
            style={[styles.input, canDelete && styles.inputValid]}
          />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.buttonContainer}>
          <Button
            text="Delete my account"
            onPress={handleDelete}
            variant="normal"
            buttonColor={DANGER}
            disabled={!canDelete}
            loading={isDeleting}
            style={styles.primaryButton}
          />
          <Button
            text="Cancel"
            onPress={onClose}
            variant="ghost"
            disabled={isDeleting}
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
    paddingTop: 48,
    paddingHorizontal: 24,
    paddingBottom: 24,
    alignItems: "center",
    position: "relative",
  },
  watermark: {
    position: "absolute",
    bottom: -20,
    right: -20,
    opacity: 0.08,
    transform: [{ rotate: "-15deg" }],
    zIndex: 0,
  },
  title: {
    ...parseTextStyle(theme.typography.Heading2),
    color: theme.colors.text.title,
    textAlign: "center",
    marginBottom: 12,
    fontWeight: "800",
  },
  body: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 24,
    opacity: 0.9,
  },
  confirmBlock: {
    width: "100%",
    marginBottom: 8,
  },
  confirmLabel: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
    marginBottom: 8,
  },
  confirmWord: {
    fontWeight: "800",
    color: DANGER,
    letterSpacing: 1,
  },
  input: {
    width: "100%",
    borderWidth: 1.5,
    borderColor: theme.colors.library.gray[200],
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    letterSpacing: 2,
    color: theme.colors.text.title,
    backgroundColor: "#FFFFFF",
  },
  inputValid: {
    borderColor: DANGER,
  },
  error: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: DANGER,
    textAlign: "center",
    marginTop: 12,
    width: "100%",
  },
  buttonContainer: {
    width: "100%",
    gap: 8,
    marginTop: 24,
  },
  primaryButton: {
    width: "100%",
    borderRadius: 24,
  },
  secondaryButton: {
    width: "100%",
    borderWidth: 0,
  },
});

export default DeleteAccountModal;
