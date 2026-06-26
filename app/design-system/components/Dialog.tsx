import React from "react";
import { Modal, View } from "react-native";
import { useTheme } from "../useTheme";
import { radius, spacing } from "../primitives/scale";
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
  const { colors, elevation } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.overlay.scrim,
          paddingHorizontal: spacing["2xl"],
        }}
      >
        <View
          style={[
            {
              width: "100%",
              maxWidth: 340,
              backgroundColor: colors.surface.elevated,
              borderRadius: radius.sheet,
              padding: spacing["2xl"],
            },
            elevation.e3,
          ]}
        >
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
        </View>
      </View>
    </Modal>
  );
};
