import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import {
  useTheme,
  spacing,
  radius,
  borderWidth,
  Text,
  Icon,
} from "../design-system";

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
  const { colors } = useTheme();
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
    <Animated.View
      style={[
        styles.card,
        { backgroundColor: colors.input.bg, borderColor: colors.input.border, transform: [{ scale: scaleAnim }] },
      ]}
    >
      <View style={styles.cardGradient}>
        <TouchableOpacity
          style={styles.dropZone}
          activeOpacity={1}
          onPress={() => handlePickImage(false)}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
        >
          <View style={[styles.iconCircle, { backgroundColor: colors.action.primary + "1F" }]}>
            <Icon name="upload-cloud" size={24} color={colors.action.primary} />
          </View>
          <Text variant="title" color={colors.action.primary}>
            Tap to upload photo
          </Text>
          <Text variant="caption" color="tertiary">
            PNG or JPG (max. {maxImages} files)
          </Text>
        </TouchableOpacity>

        <View style={styles.dividerRow}>
          <View style={[styles.line, { backgroundColor: colors.border.default }]} />
          <Text variant="caption" color="tertiary">
            OR
          </Text>
          <View style={[styles.line, { backgroundColor: colors.border.default }]} />
        </View>

        <TouchableOpacity
          style={[styles.cameraButton, { backgroundColor: colors.surface.control }]}
          onPress={() => handlePickImage(true)}
          activeOpacity={0.7}
        >
          <Icon name="camera" size={16} color={colors.action.primary} />
          <Text variant="title" color={colors.action.primary}>
            Open camera
          </Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  const renderUploadingState = () => (
    <View style={[styles.card, { backgroundColor: colors.input.bg, borderColor: colors.input.border }]}>
      <View style={styles.cardContent}>
        <View style={styles.fileIconBox}>
          <Icon name="image" size={32} color={colors.action.primary} />
        </View>
        <Text variant="h3">{Math.round(uploadProgress)}%</Text>
        <View style={styles.progressContainer}>
          <View style={[styles.progressBg, { backgroundColor: colors.surface.row }]}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  backgroundColor: colors.action.primary,
                  width: progressAnim.interpolate({
                    inputRange: [0, 100],
                    outputRange: ["0%", "100%"],
                  }),
                },
              ]}
            />
          </View>
        </View>
        <Text variant="title">Uploading {label}...</Text>
        <Text variant="caption" color="tertiary" numberOfLines={1}>
          {lastUploadedUri?.split("/").pop()}
        </Text>
      </View>
    </View>
  );

  const renderCompleteState = () => (
    <View style={[styles.card, { backgroundColor: colors.input.bg, borderColor: colors.input.border }]}>
      <View style={styles.cardContent}>
        <View style={[styles.successCircle, { backgroundColor: colors.accent.success }]}>
          <Icon name="check" size={20} color={colors.accentOn.success} />
        </View>
        <Text variant="h3">Upload Complete</Text>
        <Text variant="caption" color="tertiary" numberOfLines={1}>
          {lastUploadedUri?.split("/").pop()}
        </Text>

        <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
          <Icon name="trash-2" size={14} color={colors.text.secondary} />
          <Text variant="bodySm" color="secondary">
            Clear Upload
          </Text>
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
                style={[
                  styles.removePreview,
                  { backgroundColor: colors.accent.danger, borderColor: colors.background.canvas },
                ]}
                onPress={() => onChange(images.filter((_, i) => i !== idx))}
              >
                <Icon name="x" size={10} color={colors.accentOn.danger} />
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
    gap: spacing.lg,
  },
  card: {
    width: "100%",
    minHeight: 180,
    borderRadius: radius.card,
    borderWidth: 1.5,
    borderStyle: "dashed",
    overflow: "hidden",
  },
  cardGradient: {
    flex: 1,
    padding: spacing["2xl"],
    alignItems: "center",
    justifyContent: "center",
  },
  cardContent: {
    flex: 1,
    padding: spacing["2xl"],
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  dropZone: {
    alignItems: "center",
    gap: spacing.sm,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "80%",
    marginVertical: spacing.lg,
    gap: spacing.md,
  },
  line: {
    flex: 1,
    height: borderWidth.thin,
  },
  cameraButton: {
    paddingVertical: 10,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  fileIconBox: {
    width: 64,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  progressContainer: {
    width: "100%",
    paddingHorizontal: spacing.xl,
    marginTop: spacing.xs,
  },
  progressBg: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  successCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  clearButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  previewStrip: {
    flexDirection: "row",
    paddingHorizontal: spacing.xs,
  },
  previewItem: {
    width: 70,
    height: 70,
    borderRadius: radius.md,
    marginRight: spacing.sm,
    position: "relative",
  },
  previewImage: {
    width: "100%",
    height: "100%",
    borderRadius: radius.md,
  },
  removePreview: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
});
