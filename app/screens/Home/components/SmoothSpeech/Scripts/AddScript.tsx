import { StyleSheet, Text, View } from "react-native";
import React, { useState } from "react";
import InputField from "../../../../../components/InputField";
import ImageUpload from "../../../../../components/ImageUpload";

const AddScript = () => {
  const [scriptName, setScriptName] = useState("");
  const [scriptText, setScriptText] = useState("");
  const [sourceLink, setSourceLink] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  return (
    <View style={styles.fieldsWrapper}>
      <InputField
        label="Script name"
        placeholder="Enter the name"
        value={scriptName}
        onChangeText={setScriptName}
        required
        error={errors.scriptName}
        multiline={true}
      />
      <InputField
        label="Script"
        placeholder="Enter the script"
        value={scriptText}
        onChangeText={setScriptText}
        required
        error={errors.scriptText}
        multiline={true}
        style={{
          height: 150,
        }}
      />
      <InputField
        label="Source"
        placeholder="Enter the source link"
        value={sourceLink}
        onChangeText={setSourceLink}
        required
        error={errors.sourceLink}
        multiline={true}
      />
      <ImageUpload
        label="Title image"
        required
        error={""}
        onImageSelected={() => {}}
      />
    </View>
  );
};

export default AddScript;

const styles = StyleSheet.create({
  fieldsWrapper: {
    gap: 16,
  },
});
