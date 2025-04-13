import React from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from "react-native";

interface RadioOption {
  label: string;
  value: string;
}

interface CustomRadioGroupProps {
  options: RadioOption[];
  selectedValue: string;
  onSelect: (value: string) => void;
  containerStyle?: ViewStyle;
  optionStyle?: ViewStyle;
  labelStyle?: TextStyle;
}

const CustomRadioGroup: React.FC<CustomRadioGroupProps> = ({
  options,
  selectedValue,
  onSelect,
  containerStyle,
  optionStyle,
  labelStyle,
}) => {
  return (
    <View style={[styles.container, containerStyle]}>
      {options.map((option) => {
        const isSelected = selectedValue === option.value;
        return (
          <Pressable
            key={option.value}
            style={[styles.option, optionStyle]}
            onPress={() => onSelect(option.value)}
          >
            <View
              style={[
                styles.radioOuter,
                isSelected && styles.radioOuterSelected,
              ]}
            >
              {isSelected && <View style={styles.radioInner} />}
            </View>
            <Text style={[styles.label, labelStyle]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "column",
    gap: 12,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
  },
  radioOuter: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#D26A2A",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  radioOuterSelected: {
    borderColor: "#D26A2A",
    backgroundColor: "#D26A2A22",
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#D26A2A",
  },
  label: {
    fontSize: 14,
    color: "#333",
  },
});

export default CustomRadioGroup;
