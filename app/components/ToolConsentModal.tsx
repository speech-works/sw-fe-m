import React, { useEffect, useRef } from "react";
import { Animated, Modal, StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ToolType } from "../api/tools/types";
import {
  useTheme,
  spacing,
  radius,
  size,
  elevation,
  Text,
  Button,
} from "../design-system";

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
  const { colors } = useTheme();
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
            { backgroundColor: colors.background.sunken, opacity: opacityAnim },
          ]}
        />
        <Animated.View
          style={[
            styles.card,
            { backgroundColor: colors.surface.elevated },
            elevation.e3,
            { opacity: opacityAnim, transform: [{ scale: scaleAnim }] },
          ]}
        >
          <View style={[styles.iconContainer, { backgroundColor: colors.accent.success }]}>
            <MaterialCommunityIcons name={copy.icon} size={32} color={colors.accentOn.success} />
          </View>

          <Text variant="h3" center style={styles.title}>
            {copy.title}
          </Text>
          <Text variant="body" center color="secondary" style={styles.message}>
            {copy.body}
          </Text>

          <Button label="Got it — let's go" onPress={onAcknowledge} />
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
    paddingHorizontal: spacing["2xl"],
  },
  card: {
    borderRadius: radius.sheet,
    paddingHorizontal: spacing["3xl"],
    paddingTop: spacing["4xl"],
    paddingBottom: spacing["3xl"],
    width: "100%",
    maxWidth: 380,
    alignItems: "center",
  },
  iconContainer: {
    width: size.avatar,
    height: size.avatar,
    borderRadius: radius.chip,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  title: {
    marginBottom: spacing.lg,
  },
  message: {
    marginBottom: spacing["2xl"],
  },
});

export default ToolConsentModal;
