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

interface LowStaminaModalProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * LowStaminaModal
 *
 * A premium "Energy Low" notification modal shown once per stamina crossing
 * event, after the user finishes or exits the activity that caused the drop.
 *
 * Styled parallel to BreakthroughModal — same spring entry animation.
 * Primary CTA: Set a Recharge Reminder.
 * Secondary CTA: Dismiss ("Got it").
 *
 * No upsell / paywall — this is a human, encouraging acknowledgment.
 */
export const LowStaminaModal: React.FC<LowStaminaModalProps> = ({
  visible,
  onClose,
}) => {
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.88)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 280,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 45,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      opacityAnim.setValue(0);
      scaleAnim.setValue(0.88);
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Backdrop */}
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: "rgba(15, 23, 42, 0.55)", opacity: opacityAnim },
          ]}
        />

        <Animated.View
          style={[
            styles.card,
            {
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Close Button */}
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <MaterialCommunityIcons
              name="close"
              size={20}
              color={theme.colors.text.disabled}
            />
          </TouchableOpacity>

          {/* Icon */}
          <LinearGradient
            colors={["#F97316", "#EF4444"]}
            style={styles.iconContainer}
          >
            <MaterialCommunityIcons
              name="lightning-bolt"
              size={32}
              color="white"
            />
          </LinearGradient>

          {/* Tag */}
          <Text style={styles.tag}>Low Stamina</Text>

          {/* Title */}
          <Text style={styles.title}>Running on Empty</Text>

          {/* Message */}
          <Text style={styles.message}>
            Your stamina is running low because you've practiced hard today!
            Take a well-deserved break to rest your voice, and come back stronger.
          </Text>

          {/* CTA */}
          <TouchableOpacity
            style={styles.actionButtonContainer}
            onPress={onClose}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={["#F97316", "#EF4444"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.actionButtonGradient}
            >
              <Text style={styles.actionButtonText}>I'll Be Back 💪</Text>
            </LinearGradient>
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
    paddingTop: 48,
    paddingBottom: 32,
    width: "100%",
    maxWidth: 380,
    alignItems: "center",
    ...parseShadowStyle(theme.shadow.elevation4),
  },
  closeBtn: {
    position: "absolute",
    top: 20,
    right: 20,
    zIndex: 10,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    ...parseShadowStyle(theme.shadow.elevation2),
    shadowColor: "#F97316",
    shadowOpacity: 0.3,
  },
  tag: {
    fontSize: 12,
    fontWeight: "800",
    color: "#F97316",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  title: {
    ...parseTextStyle(theme.typography.Heading3),
    fontSize: 22,
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
  actionButtonContainer: {
    width: "100%",
    height: 54,
    borderRadius: 18,
    overflow: "hidden",
    ...parseShadowStyle(theme.shadow.elevation2),
    shadowColor: "#F97316",
  },
  actionButtonGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default LowStaminaModal;
