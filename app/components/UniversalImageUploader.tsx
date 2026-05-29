import * as ImagePicker from "expo-image-picker";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Icon from "react-native-vector-icons/FontAwesome5";
import { theme } from "../Theme/tokens";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../util/functions/parseStyles";

type UploaderState = "ready" | "uploading" | "complete";

interface UniversalImageUploaderProps {
  images: string[];
  onChange: (newImages: string[]) => void;
  maxImages?: number;
  label?: string;
}

const UniversalImageUploader = ({
  images,
  onChange,
  maxImages = 5,
  label = "screenshots",
}: UniversalImageUploaderProps) => {
  const [state, setState] = useState<UploaderState>("ready");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [lastUploadedUri, setLastUploadedUri] = useState<string | null>(null);

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (state === "uploading") {
      Animated.timing(progressAnim, {
        toValue: uploadProgress,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  }, [uploadProgress, state]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const simulateUpload = (uri: string) => {
    setState("uploading");
    setUploadProgress(0);
    setLastUploadedUri(uri);

    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 30;
      if (progress >= 100) {
        progress = 100;
        setUploadProgress(100);
        clearInterval(interval);
        setTimeout(() => {
          setState("complete");
          onChange([...images, uri]);
        }, 400);
      } else {
        setUploadProgress(progress);
      }
    }, 200);
  };

  const handlePickImage = async (useCamera = false) => {
    const permissionMethod = useCamera
      ? ImagePicker.requestCameraPermissionsAsync
      : ImagePicker.requestMediaLibraryPermissionsAsync;
    const { status } = await permissionMethod();

    if (status !== "granted") {
      Alert.alert(
        "Permission required",
        `Please grant ${useCamera ? "camera" : "gallery"} permissions to upload ${label}.`,
      );
      return;
    }

    const launchMethod = useCamera
      ? ImagePicker.launchCameraAsync
      : ImagePicker.launchImageLibraryAsync;
    const result = await launchMethod({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets[0].uri) {
      if (images.length >= maxImages) {
        Alert.alert(
          "Limit reached",
          `You can upload up to ${maxImages} images.`,
        );
        return;
      }
      simulateUpload(result.assets[0].uri);
    }
  };

  const handleClear = () => {
    setState("ready");
    setUploadProgress(0);
    setLastUploadedUri(null);
  };

  const renderReadyState = () => (
    <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
      <BlurView intensity={20} tint="light" style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={["#FFFFFF", "#FFFFFF"]}
        style={styles.cardGradient}
      >
        <TouchableOpacity
          style={styles.dropZone}
          activeOpacity={1}
          onPress={() => handlePickImage(false)}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
        >
          <View style={styles.iconCircle}>
            <Icon
              name="cloud-upload-alt"
              size={24}
              color={theme.colors.actionPrimary.default}
            />
          </View>
          <Text style={styles.stateTitle}>Tap to upload photo</Text>
          <Text style={styles.stateSub}>
            PNG or JPG (max. {maxImages} files)
          </Text>
        </TouchableOpacity>

        <View style={styles.dividerRow}>
          <View style={styles.line} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.line} />
        </View>

        <TouchableOpacity
          style={styles.cameraButton}
          onPress={() => handlePickImage(true)}
          activeOpacity={0.7}
        >
          <Icon
            name="camera"
            size={14}
            color={theme.colors.actionPrimary.default}
          />
          <Text style={styles.cameraButtonText}>Open camera</Text>
        </TouchableOpacity>
      </LinearGradient>
    </Animated.View>
  );

  const renderUploadingState = () => (
    <View style={styles.card}>
      <BlurView intensity={10} tint="light" style={StyleSheet.absoluteFill} />
      <View style={styles.cardContent}>
        <View style={styles.fileIconBox}>
          <Icon
            name="file-image"
            size={32}
            color={theme.colors.actionPrimary.default}
          />
          <View style={styles.fileLabel}>
            <Text style={styles.fileLabelText}>JPG</Text>
          </View>
        </View>
        <Text style={styles.percentageText}>{Math.round(uploadProgress)}%</Text>
        <View style={styles.progressContainer}>
          <View style={styles.progressBg}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 100],
                    outputRange: ["0%", "100%"],
                  }),
                },
              ]}
            />
          </View>
        </View>
        <Text style={styles.uploadingTitle}>Uploading {label}...</Text>
        <Text style={styles.fileNameText} numberOfLines={1}>
          {lastUploadedUri?.split("/").pop()}
        </Text>
      </View>
    </View>
  );

  const renderCompleteState = () => (
    <View style={styles.card}>
      <BlurView intensity={15} tint="light" style={StyleSheet.absoluteFill} />
      <View style={styles.cardContent}>
        <View style={styles.successCircle}>
          <Icon name="check" size={20} color="white" />
        </View>
        <Text style={styles.completeTitle}>Upload Complete</Text>
        <Text style={styles.fileNameText} numberOfLines={1}>
          {lastUploadedUri?.split("/").pop()}
        </Text>

        <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
          <Icon name="trash-alt" size={14} color={theme.colors.text.default} />
          <Text style={styles.clearButtonText}>Clear Upload</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.wrapper}>
      {state === "ready" && renderReadyState()}
      {state === "uploading" && renderUploadingState()}
      {state === "complete" && renderCompleteState()}

      {/* Preview Strip for already uploaded images */}
      {images.length > 0 && state === "ready" && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.previewStrip}
        >
          {images.map((uri, idx) => (
            <View key={idx} style={styles.previewItem}>
              <Image source={{ uri }} style={styles.previewImage} />
              <TouchableOpacity
                style={styles.removePreview}
                onPress={() => onChange(images.filter((_, i) => i !== idx))}
              >
                <Icon name="times" size={10} color="white" />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

export default UniversalImageUploader;

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
    gap: 16,
  },
  card: {
    width: "100%",
    minHeight: 180,
    borderRadius: 24,
    backgroundColor: "#FFFFFF", // Changed from rgba(255,255,255,0.4)
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.6)",
    borderStyle: "dashed",
    overflow: "hidden",
    ...parseShadowStyle(theme.shadow.elevation2),
  },
  cardGradient: {
    flex: 1,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  cardContent: {
    flex: 1,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  dropZone: {
    alignItems: "center",
    gap: 8,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  stateTitle: {
    ...parseTextStyle(theme.typography.Body),
    fontWeight: "700",
    color: theme.colors.actionPrimary.default,
  },
  stateSub: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.disabled,
    fontSize: 12,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "80%",
    marginVertical: 16,
    gap: 12,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  dividerText: {
    fontSize: 10,
    fontWeight: "800",
    color: theme.colors.text.disabled,
  },
  cameraButton: {
    backgroundColor: "white",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    ...parseShadowStyle(theme.shadow.elevation1),
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  cameraButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.actionPrimary.default,
  },
  // Uploading
  fileIconBox: {
    width: 64,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  fileLabel: {
    position: "absolute",
    bottom: 12,
    backgroundColor: "#1E3A8A",
    paddingHorizontal: 4,
    borderRadius: 2,
  },
  fileLabelText: {
    color: "white",
    fontSize: 8,
    fontWeight: "900",
  },
  percentageText: {
    fontSize: 16,
    fontWeight: "800",
    color: theme.colors.text.title,
  },
  progressContainer: {
    width: "100%",
    paddingHorizontal: 20,
    marginTop: 4,
  },
  progressBg: {
    height: 6,
    backgroundColor: "#EFF6FF",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: theme.colors.actionPrimary.default,
    borderRadius: 3,
  },
  uploadingTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: theme.colors.text.title,
    marginTop: 8,
  },
  fileNameText: {
    fontSize: 12,
    color: theme.colors.text.disabled,
    fontWeight: "500",
  },
  // Complete
  successCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.library.green[500],
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  completeTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: theme.colors.text.title,
  },
  clearButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.text.default,
  },
  // Preview
  previewStrip: {
    flexDirection: "row",
    paddingHorizontal: 4,
  },
  previewItem: {
    width: 70,
    height: 70,
    borderRadius: 12,
    marginRight: 10,
    position: "relative",
    ...parseShadowStyle(theme.shadow.elevation1),
  },
  previewImage: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
  },
  removePreview: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: theme.colors.library.red[500],
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "white",
  },
});
