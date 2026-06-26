import React from "react";
import { View } from "react-native";
import PressableScale from "../../components/PressableScale";
import { useTheme } from "../useTheme";
import { radius, opacity } from "../primitives/scale";
import { Icon } from "./Icon";
import { Text } from "./Text";

export interface CheckboxProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: string;
  disabled?: boolean;
}

/** Square multi-select control. Checked = brand fill + dark tick. */
export const Checkbox: React.FC<CheckboxProps> = ({ checked, onChange, label, disabled = false }) => {
  const { colors } = useTheme();
  const box = (
    <View
      style={{
        width: 22,
        height: 22,
        borderRadius: radius.sm,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: checked ? colors.action.primary : "transparent",
        borderWidth: checked ? 0 : 2,
        borderColor: colors.border.strong,
      }}
    >
      {checked ? <Icon name="check" size={15} color={colors.action.onPrimary} /> : null}
    </View>
  );

  return (
    <PressableScale
      onPress={disabled ? undefined : () => onChange(!checked)}
      disabled={disabled}
      style={{ flexDirection: "row", alignItems: "center", gap: 12, opacity: disabled ? opacity.disabled : 1 }}
    >
      {box}
      {label ? <Text variant="body">{label}</Text> : null}
    </PressableScale>
  );
};
