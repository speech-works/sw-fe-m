import React, { useEffect, useRef } from "react";
import {
  Animated,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { theme } from "../Theme/tokens";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../util/functions/parseStyles";

interface AICallConsentModalProps {
  visible: boolean;
  /** Called when the user taps "Got it" — caller persists consent + proceeds. */
  onAcknowledge: () => void;
}

/**
 * One-time disclosure shown before the user's first AI conversation, explaining
 * that their voice is streamed to a third-party AI partner during the call.
 * Mirrors the visual style of ToolConsentModal.
 */
export const AICallConsentModal: React.FC<AICallConsentModalProps> = ({
  visible,
  onAcknowledge,
}) => {
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      opacityAnim.setValue(0);
      scaleAnim.setValue(0.9);
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onAcknowledge}
    >
      <View style={styles.container}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: "rgba(15, 23, 42, 0.6)", opacity: opacityAnim },
          ]}
        />
        <Animated.View
          style={[
            styles.card,
            { opacity: opacityAnim, transform: [{ scale: scaleAnim }] },
          ]}
        >
          <LinearGradient
            colors={["#6366F1", "#4338CA"]}
            style={styles.iconContainer}
          >
            <MaterialCommunityIcons
              name="account-voice"
              size={32}
              color="white"
            />
          </LinearGradient>

          <Text style={styles.title}>Before your first AI conversation</Text>
          <Text style={styles.message}>
            Your voice is streamed in real time to our AI partner so it can
            respond to you and transcribe your speech during the call. It is used
            only for this practice session and is not saved on your device — you
            can end the call anytime.
          </Text>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={onAcknowledge}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Acknowledge AI conversation disclosure and continue"
          >
            <Text style={styles.actionButtonText}>Got it — let's start</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 32,
    paddingHorizontal: 32,
    paddingTop: 40,
    paddingBottom: 32,
    width: "100%",
    maxWidth: 380,
    alignItems: "center",
    ...parseShadowStyle(theme.shadow.elevation4),
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    ...parseShadowStyle(theme.shadow.elevation2),
    shadowColor: "#4338CA",
    shadowOpacity: 0.3,
  },
  title: {
    ...parseTextStyle(theme.typography.Heading3),
    fontSize: 20,
    fontWeight: "700",
    color: theme.colors.text.title,
    textAlign: "center",
    marginBottom: 16,
  },
  message: {
    ...parseTextStyle(theme.typography.Body),
    fontSize: 15,
    color: theme.colors.text.default,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 28,
  },
  actionButton: {
    width: "100%",
    height: 54,
    borderRadius: 18,
    backgroundColor: "#4338CA",
    alignItems: "center",
    justifyContent: "center",
    ...parseShadowStyle(theme.shadow.elevation1),
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default AICallConsentModal;
