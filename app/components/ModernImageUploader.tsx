import React, { useRef } from "react";
import {
  View,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Text,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import Icon from "react-native-vector-icons/FontAwesome5";
import { theme } from "../Theme/tokens";
import { parseShadowStyle } from "../util/functions/parseStyles";

type ImageUploaderProps = {
  images: string[];
  onChange: (newImages: string[]) => void;
  maxImages?: number;
};

const ModernImageUploader = ({
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
      allowsMultipleSelection: false,
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
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const handleRemoveImage = (index: number) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    onChange(newImages);
  };

  return (
    <View style={styles.wrapper}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        {images.map((uri, index) => (
          <View key={uri} style={styles.imageCard}>
            <Image source={{ uri }} style={styles.image} />
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => handleRemoveImage(index)}
            >
              <Icon name="times" size={10} color="#fff" />
            </TouchableOpacity>
          </View>
        ))}

        {images.length < maxImages && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleAddImage}
            activeOpacity={0.7}
          >
            <View style={styles.iconCircle}>
              <Icon name="plus" size={16} />
            </View>
            <Text style={styles.addText}>Add Image</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
};

export default ModernImageUploader;

const styles = StyleSheet.create({
  wrapper: {
    height: 110,
  },
  container: {
    paddingLeft: 4,
    gap: 12,
    alignItems: "center",
  },
  imageCard: {
    width: 90,
    height: 90,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    ...parseShadowStyle(theme.shadow.elevation1),
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  removeButton: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "rgba(0,0,0,0.6)",
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  addButton: {
    width: 90,
    height: 90,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    backgroundColor: theme.colors.surface.disabled,
    alignItems: "center",
    justifyContent: "center",
  },
  addText: {
    fontSize: 12,
    fontWeight: "700",
  },
});
