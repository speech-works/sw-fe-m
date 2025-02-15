import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
} from "react-native";
import { parseTextStyle } from "../util/functions/parseFont";
import { theme } from "../Theme/tokens";

interface InputFieldProps extends TextInputProps {
  label: string;
  required?: boolean;
  error?: string;
}

const InputField: React.FC<InputFieldProps> = ({
  label,
  required = false,
  error = "",
  ...textInputProps
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View
      style={[
        styles.container,
        error ? styles.errorBorder : isFocused ? styles.focusedBorder : null,
      ]}
    >
      <Text
        style={[
          styles.label,
          error ? styles.errorLabel : isFocused ? styles.focusedLabel : null,
        ]}
      >
        {label} {required && <Text style={styles.asterisk}>*</Text>}
      </Text>
      <TextInput
        style={styles.input}
        placeholderTextColor="#999"
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        {...textInputProps}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 2,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    position: "relative",
    backgroundColor: "#fff",
  },
  label: {
    position: "absolute",
    top: -12,
    left: 15,
    backgroundColor: "#fff",
    paddingHorizontal: 5,
    color: theme.colors.neutral.black,
    ...parseTextStyle(theme.typography.paragraphSmall.heavy),
  },
  asterisk: {
    color: "red",
  },
  input: {
    ...parseTextStyle(theme.typography.paragraphBase.heavy),
  },
  errorBorder: {
    borderColor: "red",
  },
  errorLabel: {
    color: "red",
  },
  errorText: {
    color: "red",
    fontSize: 12,
    marginTop: 5,
  },
  focusedBorder: {
    borderColor: "#B25300",
  },
  focusedLabel: {
    color: "#B25300",
  },
});

export default InputField;
