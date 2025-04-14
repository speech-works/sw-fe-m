import { StyleSheet, Text, View } from "react-native";
import React, { useState } from "react";
import CustomRadioGroup from "../../../../../components/RadioGroup";
import { parseTextStyle } from "../../../../../util/functions/parseFont";
import { theme } from "../../../../../Theme/tokens";
import InputField from "../../../../../components/InputField";

const FinishForm = () => {
  const [selected, setSelected] = useState("");
  const [reflectionText, setReflectionText] = useState("");

  const options = [
    { label: "I did it!", value: "done" },
    { label: "I tried but struggled", value: "tried" },
    { label: "I skipped", value: "skipped" },
  ];
  return (
    <View style={styles.formWrapper}>
      <View style={styles.formItem}>
        <Text style={styles.formItemTitleText}>How did it go?</Text>
        <View style={styles.radioWrapper}>
          <CustomRadioGroup
            options={options}
            selectedValue={selected}
            onSelect={setSelected}
            labelStyle={styles.radioLabelStyle}
            containerStyle={styles.radioContainer}
          />
        </View>
      </View>
      <View style={styles.formItem}>
        <InputField
          label="Reflection"
          placeholder="Take a moment to reflect — what were you feeling before, during, and after the challenge? Did anything surprise you or make you feel proud, even just a little?"
          value={reflectionText}
          onChangeText={setReflectionText}
          multiline={true}
          style={{
            height: 150,
          }}
        />
      </View>
    </View>
  );
};

export default FinishForm;

const styles = StyleSheet.create({
  formWrapper: { gap: 20 },
  formItem: {
    gap: 8,
  },
  formItemTitleText: {},
  radioWrapper: {},
  radioContainer: {
    gap: 5,
  },
  radioLabelStyle: {
    color: theme.colors.neutral[3],
    ...parseTextStyle(theme.typography.paragraphSmall.heavy),
  },
});
