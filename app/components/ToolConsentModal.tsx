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
import { ToolType } from "../api/tools/types";

interface ToolConsentCopy {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  body: string;
}

/**
 * One-time educational copy per monitored tool. DAF / Chorus are
 * fluency-inducing aids; the message frames them as companions, never
 * forbidden ("your voice is enough").
 */
const CONSENT_COPY: Partial<Record<ToolType, ToolConsentCopy>> = {
  [ToolType.DAF]: {
    icon: "headphones",
    title: "About Delayed Auditory Feedback (DAF)",
    body:
      "DAF can make speech feel smoother by playing back your voice with a slight delay. Many people find it helpful in practice sessions.\n\n" +
      "Research shows DAF works best as a companion to other techniques — not as a standalone solution. Its effect can diminish with extended use.\n\n" +
      "It's always okay to practice without it. Your voice is enough.",
  },
  [ToolType.CHORUS]: {
    icon: "account-voice",
    title: "About the Guide",
    body:
      "The Guide plays a gentle second voice alongside yours, which can make speech feel smoother. Many people find it helpful in practice.\n\n" +
      "Like other fluency aids, it works best as a companion to other techniques — not on its own — and its effect can fade with heavy use.\n\n" +
      "It's always okay to practice without it. Your voice is enough.",
  },
};

interface ToolConsentModalProps {
  visible: boolean;
  tool: ToolType | null;
  /** Called when the user taps "Got it" — caller should persist consent and
   *  then proceed with activating the tool. */
  onAcknowledge: () => void;
}

export const ToolConsentModal: React.FC<ToolConsentModalProps> = ({
  visible,
  tool,
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

  const copy = tool ? CONSENT_COPY[tool] : undefined;
  if (!copy) return null;

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
            colors={["#10B981", "#059669"]}
            style={styles.iconContainer}
          >
            <MaterialCommunityIcons name={copy.icon} size={32} color="white" />
          </LinearGradient>

          <Text style={styles.title}>{copy.title}</Text>
          <Text style={styles.message}>{copy.body}</Text>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={onAcknowledge}
            activeOpacity={0.8}
          >
            <Text style={styles.actionButtonText}>Got it — let's go</Text>
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
    shadowColor: "#059669",
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
    backgroundColor: "#059669",
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

export default ToolConsentModal;
