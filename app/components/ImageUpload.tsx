import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { parseTextStyle } from "../util/functions/parseStyles";
import { theme } from "../Theme/tokens";
import Icon from "react-native-vector-icons/MaterialIcons";
import * as ImagePicker from "expo-image-picker";

interface ImageUploadProps {
  label: string;
  required?: boolean;
  error?: string;
  onImageSelected?: (uri: string) => void;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  label,
  required = false,
  error = "",
  onImageSelected,
}) => {
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const [imageUri, setImageUri] = useState<string | null>(null);

  const handleImageUpload = async () => {
    // Request permissions first
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== "granted") {
      alert("Permission to access the photo library is required!");
      return;
    }
    try {
      console.log("Calling launchImageLibraryAsync"); // Debugging log
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        quality: 1,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        setImageUri(uri);
        if (onImageSelected) {
          onImageSelected(uri);
        }
      }
      console.log("Result:", result); // Debugging log
    } catch (error) {
      console.error("Error in launchImageLibraryAsync:", error); // Debugging log
    }
  };
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
      <TouchableOpacity
        style={styles.uploadInfoWrapper}
        onPress={handleImageUpload}
        activeOpacity={0.7}
      >
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.imagePreview} />
        ) : (
          <>
            <Icon name="upload" size={20} color={theme.colors.neutral[5]} />
            <Text style={styles.uploadText}>click here to upload an image</Text>
          </>
        )}
      </TouchableOpacity>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 2,
    borderColor: "#ccc",
    borderRadius: 8,
    borderStyle: "dashed",
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
  uploadInfoWrapper: {
    flexDirection: "row",
    gap: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadText: {
    ...parseTextStyle(theme.typography.paragraphXSmall.regular),
    color: theme.colors.neutral[3],
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
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
});

export default ImageUpload;
