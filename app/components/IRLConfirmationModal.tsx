import React from "react";
import PromptBottomSheet from "./PromptBottomSheet";

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
 * Prompts users to confirm they've actually completed a real-life challenge
 * before moving on to reflection. Framed in an SLP-/PWS-friendly way. Uses the
 * shared `PromptBottomSheet` so it matches every other confirmation sheet.
 */
const IRLConfirmationModal: React.FC<IRLConfirmationModalProps> = ({
  visible,
  onClose,
  onConfirm,
}) => (
  <PromptBottomSheet
    visible={visible}
    onClose={onClose}
    icon="lightbulb-on-outline"
    title="Ready to reflect?"
    message="Wonderful intention! Before we dive into the reflection, have you already had a chance to try this activity out in the real world?"
    primaryButton={{ label: "Yes, log my experience", onPress: onConfirm }}
    secondaryButton={{ label: "Nope! Let me do this", onPress: onClose }}
  />
);

export default IRLConfirmationModal;
