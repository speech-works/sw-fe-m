import React from "react";
import { Pressable, ViewStyle, StyleSheet } from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";

interface CustomCheckboxProps {
  checked: boolean;
  onToggle: () => void;
  style?: ViewStyle;
}

const CustomCheckbox: React.FC<CustomCheckboxProps> = ({ checked, onToggle, style }) => {
  return (
    <Pressable onPress={onToggle} style={[styles.checkbox, checked && styles.checked, style]}>
      {checked && <Icon name="check" size={12} color="white" />}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 2, // Rounded corners
    borderWidth: 2,
    borderColor: "#D26A2A", // Orange border
    alignItems: "center",
    justifyContent: "center",
  },
  checked: {
    backgroundColor: "#D26A2A", // Orange background
    borderColor: "#D26A2A",
  },
});

export default CustomCheckbox;
