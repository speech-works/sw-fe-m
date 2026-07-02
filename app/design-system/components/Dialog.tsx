import React from "react";
import { View } from "react-native";
import { AnimatedModal } from "./AnimatedModal";
import { Button } from "./Button";
import { Text } from "./Text";

export interface DialogProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message?: string;
  confirmLabel?: string;
  onConfirm?: () => void;
  /** Style the confirm action as destructive (danger) rather than primary. */
  destructive?: boolean;
  cancelLabel?: string;
  accentColor?: string;
  onAccentColor?: string;
}

/** Centered confirmation dialog (distinct from the bottom Sheet) — for short, often destructive, confirms. */
export const Dialog: React.FC<DialogProps> = ({
  visible,
  onClose,
  title,
  message,
  confirmLabel = "Confirm",
  onConfirm,
  destructive,
  cancelLabel = "Cancel",
  accentColor,
  onAccentColor,
}) => {
  return (
    <AnimatedModal visible={visible} onClose={onClose}>
      <Text variant="h2">{title}</Text>
      {message ? (
        <Text variant="bodySm" color="secondary" style={{ marginTop: 8, lineHeight: 21 }}>
          {message}
        </Text>
      ) : null}
      {/* Stacked full-width (matches the DS confirm-sheet convention) so labels of any
          length stay on one centred line — a 50/50 row cramped the wider label into a wrap. */}
      <View style={{ gap: 10, marginTop: 22 }}>
        {onConfirm ? (
          <Button
            label={confirmLabel}
            variant={destructive ? "danger" : "primary"}
            accentColor={destructive ? undefined : accentColor}
            onAccentColor={destructive ? undefined : onAccentColor}
            size="md"
            onPress={onConfirm}
          />
        ) : null}
        <Button label={cancelLabel} variant="secondary" size="md" onPress={onClose} />
      </View>
    </AnimatedModal>
  );
};
