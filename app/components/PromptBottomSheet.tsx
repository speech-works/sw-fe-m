import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import BottomSheetModal from "./BottomSheetModal";
import { theme } from "../Theme/tokens";
import { parseTextStyle, parseShadowStyle } from "../util/functions/parseStyles";

interface PromptBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message: string;
  icon?: string;
  iconColor?: string;
  primaryButton?: {
    label: string;
    onPress: () => void;
    destructive?: boolean;
  };
  secondaryButton?: {
    label: string;
    onPress: () => void;
  };
}

const PromptBottomSheet: React.FC<PromptBottomSheetProps> = ({
  visible,
  onClose,
  title,
  message,
  icon = "alert-circle-outline",
  iconColor = theme.colors.actionPrimary.default,
  primaryButton,
  secondaryButton,
}) => {
  return (
    <BottomSheetModal 
      visible={visible} 
      onClose={onClose} 
      fitContent 
      showHandle 
      showCloseButton
      hasBottomSafePadding
    >
      <View style={styles.container}>
        {/* Watermark Icon */}
        <View style={styles.watermark}>
          <MaterialCommunityIcons name={icon as any} size={120} color={iconColor} />
        </View>

        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>

        <View style={styles.buttonContainer}>
          {primaryButton && (
            <TouchableOpacity 
              style={styles.primaryButton} 
              onPress={() => {
                primaryButton.onPress();
                onClose();
              }}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={primaryButton.destructive ? ["#EF4444", "#DC2626"] : [theme.colors.actionPrimary.default, "#E06B00"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradient}
              >
                <Text style={styles.primaryButtonText}>{primaryButton.label}</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {secondaryButton && (
            <TouchableOpacity 
              style={styles.secondaryButton} 
              onPress={() => {
                secondaryButton.onPress();
                onClose();
              }}
              activeOpacity={0.6}
            >
              <Text style={styles.secondaryButtonText}>{secondaryButton.label}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </BottomSheetModal>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 48,
    paddingHorizontal: 24,
    paddingBottom: 24,
    alignItems: "center",
    position: "relative",
  },
  watermark: {
    position: "absolute",
    bottom: -20,
    right: -20,
    opacity: 0.08,
    transform: [{ rotate: "-15deg" }],
    zIndex: 0,
  },
  title: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
    textAlign: "center",
    marginBottom: 12,
    fontSize: 20,
    fontWeight: "800",
  },
  message: {
    ...parseTextStyle(theme.typography.Body),
    color: "#64748B",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
  },
  buttonContainer: {
    width: "100%",
    gap: 12,
  },
  primaryButton: {
    height: 56,
    borderRadius: 16,
    overflow: "hidden",
    ...parseShadowStyle(theme.shadow.elevation2),
  },
  gradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  primaryButtonText: {
    ...parseTextStyle(theme.typography.Heading3),
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  secondaryButton: {
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  secondaryButtonText: {
    ...parseTextStyle(theme.typography.Body),
    color: "#64748B",
    fontWeight: "700",
    fontSize: 16,
  },
});

export default PromptBottomSheet;
