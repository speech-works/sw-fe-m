import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  useTheme,
  spacing,
  AnimatedModal,
  Text,
  TextField,
  Button,
  Icon,
} from "../../../design-system";

const CONFIRM_WORD = "DELETE";

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
  const { colors } = useTheme();
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
    <AnimatedModal
      visible={visible}
      onClose={isDeleting ? () => {} : onClose}
      dismissOnBackdrop={false}
      maxWidth={360}
      contentStyle={styles.card}
    >
      <View style={styles.watermark} pointerEvents="none">
        <Icon name="alert-octagon" size={160} color={colors.accent.danger} />
      </View>

      <Text variant="h2" center>
        Delete your account?
      </Text>
      <Text variant="bodySm" color="secondary" center style={styles.body}>
        This permanently deletes your account and all of your data, including your
        practice recordings, progress, assessments, and history. This cannot be undone.
      </Text>

      <View style={styles.confirmBlock}>
        <Text variant="label" color="secondary" style={styles.confirmLabel}>
          Type{" "}
          <Text variant="label" color={colors.feedback.dangerText}>
            {CONFIRM_WORD}
          </Text>{" "}
          to confirm
        </Text>
        <TextField
          value={confirmText}
          onChangeText={setConfirmText}
          autoCapitalize="characters"
          autoCorrect={false}
          editable={!isDeleting}
          placeholder={CONFIRM_WORD}
        />
      </View>

      {error ? (
        <Text variant="bodySm" color={colors.feedback.dangerText} center style={styles.error}>
          {error}
        </Text>
      ) : null}

      <View style={styles.buttonContainer}>
        <Button
          label="Delete my account"
          onPress={handleDelete}
          variant="danger"
          disabled={!canDelete}
          loading={isDeleting}
        />
        <Button label="Cancel" onPress={onClose} variant="ghost" disabled={isDeleting} />
      </View>
    </AnimatedModal>
  );
};

const styles = StyleSheet.create({
  // The card chrome (size, radius, padding, bg, elevation) comes from AnimatedModal;
  // we only add clipping so the oversized danger watermark stays inside the corners.
  card: {
    overflow: "hidden",
  },
  watermark: {
    position: "absolute",
    bottom: -20,
    right: -20,
    opacity: 0.08,
    transform: [{ rotate: "-15deg" }],
    zIndex: 0,
  },
  body: {
    marginTop: spacing.md,
    marginBottom: spacing["2xl"],
  },
  confirmBlock: {
    width: "100%",
  },
  confirmLabel: {
    marginBottom: spacing.sm,
  },
  error: {
    marginTop: spacing.md,
    width: "100%",
  },
  buttonContainer: {
    width: "100%",
    gap: spacing.sm,
    marginTop: spacing["2xl"],
  },
});

export default DeleteAccountModal;
