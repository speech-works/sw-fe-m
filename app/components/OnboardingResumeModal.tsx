import React from "react";
import { View, Text, StyleSheet, Modal, TouchableOpacity } from "react-native";
import Button from "./Button";
import { theme } from "../Theme/tokens";
import { parseTextStyle } from "../util/functions/parseStyles";
import Icon from "react-native-vector-icons/Feather";

interface OnboardingResumeModalProps {
  visible: boolean;
  onResume: () => void;
  onStartOver: () => void;
  onDismiss?: () => void;
}

const OnboardingResumeModal: React.FC<OnboardingResumeModalProps> = ({
  visible,
  onResume,
  onStartOver,
  onDismiss,
}) => {
  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onDismiss || onResume}
    >
      <View style={styles.overlay}>
        {/* Backdrop tap to resume (or close) */}
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onDismiss || onResume}
        />

        {/* Bottom Sheet Content */}
        <View style={styles.sheet}>
          <View style={styles.container}>
            {/* Icon */}
            <View style={styles.iconContainer}>
              <View style={styles.iconCircle}>
                <Icon
                  name="bookmark"
                  size={32}
                  color={theme.colors.actionPrimary.default}
                />
              </View>
            </View>

            {/* Title & Subtitle */}
            <Text style={styles.title}>Welcome Back!</Text>
            <Text style={styles.subtitle}>
              You have an onboarding in progress. Would you like to resume?
            </Text>

            {/* Action Buttons */}
            <View style={styles.actions}>
              <Button
                text="Resume"
                onPress={onResume}
                style={styles.resumeButton}
              />
              <Button
                text="Start Over"
                variant="ghost"
                onPress={onStartOver}
                textColor={theme.colors.text.default}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    width: "100%",
    paddingBottom: 34, // Safe area padding approximation
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  container: {
    padding: 24,
    alignItems: "center",
  },
  iconContainer: {
    marginBottom: 16,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.background.light,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    ...parseTextStyle(theme.typography.Heading2),
    color: theme.colors.text.title,
    marginBottom: 4,
  },
  subtitle: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
    marginBottom: 28,
    textAlign: "center",
  },
  actions: {
    width: "100%",
    gap: 12,
  },
  resumeButton: {
    width: "100%",
  },
});

export default OnboardingResumeModal;
