import React, { useRef } from "react";
import {
  View,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import Icon from "react-native-vector-icons/FontAwesome5";
import { theme } from "../Theme/tokens"; // Adjust path to your theme
import { parseShadowStyle } from "../util/functions/parseStyles";

type ImageUploaderProps = {
  images: string[];
  onChange: (newImages: string[]) => void;
  maxImages?: number;
};

const ImageUploader = ({
  images,
  onChange,
  maxImages = 5,
}: ImageUploaderProps) => {
  const scrollViewRef = useRef<ScrollView | null>(null);

  const handleAddImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission required",
        "Please grant camera roll permissions."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: false, // Expo does not support multiple at once
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets[0].uri) {
      if (images.length >= maxImages) {
        Alert.alert(
          "Limit reached",
          `You can upload up to ${maxImages} images.`
        );
        return;
      }
      onChange([...images, result.assets[0].uri]);
      // Scroll to end after next render
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const handleRemoveImage = (index: number) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    onChange(newImages);
    // Scroll to end after next render
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  return (
    <ScrollView
      ref={scrollViewRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {images.map((uri, index) => (
        <View key={index} style={styles.imageWrapper}>
          <Image source={{ uri }} style={styles.image} />
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => handleRemoveImage(index)}
          >
            <Icon name="times" size={12} color="#fff" />
          </TouchableOpacity>
        </View>
      ))}
      {images.length < maxImages && (
        <TouchableOpacity style={styles.addButton} onPress={handleAddImage}>
          <Icon name="plus" size={20} color={theme.colors.text.title} />
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};

export default ImageUploader;

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  imageWrapper: {
    position: "relative",
    width: 80,
    height: 80,
    borderRadius: 12,
    overflow: "hidden",
    padding: 4,
    ...parseShadowStyle(theme.shadow.elevation1),
  },
  image: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
  },
  removeButton: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: "50%",
    padding: 4,
  },
  addButton: {
    width: 72,
    height: 72,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.library.gray[300],
    backgroundColor: theme.colors.surface.default,
    alignItems: "center",
    justifyContent: "center",
    ...parseShadowStyle(theme.shadow.elevation1),
  },
});
