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
}) => {
  return (
    <AnimatedModal visible={visible} onClose={onClose}>
      <Text variant="h2">{title}</Text>
      {message ? (
        <Text variant="bodySm" color="secondary" style={{ marginTop: 8, lineHeight: 21 }}>
          {message}
        </Text>
      ) : null}
      <View style={{ flexDirection: "row", gap: 10, marginTop: 22 }}>
        <View style={{ flex: 1 }}>
          <Button label={cancelLabel} variant="secondary" size="md" onPress={onClose} />
        </View>
        {onConfirm ? (
          <View style={{ flex: 1 }}>
            <Button
              label={confirmLabel}
              variant={destructive ? "danger" : "primary"}
              size="md"
              onPress={onConfirm}
            />
          </View>
        ) : null}
      </View>
    </AnimatedModal>
  );
};
