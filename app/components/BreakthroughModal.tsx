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
import { BreakthroughMetadata } from "../api/forms/types";

interface BreakthroughModalProps {
  visible: boolean;
  data: BreakthroughMetadata | null;
  onClose: () => void;
}

const AXIS_ICONS: Record<string, any> = {
  mastery: "target",
  ease: "leaf",
  courage: "shield-check",
  confidence: "lightning-bolt",
  social: "account-group",
};

export const BreakthroughModal: React.FC<BreakthroughModalProps> = ({
  visible,
  data,
  onClose,
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

  if (!data) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
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

          <LinearGradient
            colors={["#6366F1", "#8B5CF6"]}
            style={styles.iconContainer}
          >
            <MaterialCommunityIcons
              name={AXIS_ICONS[data.axis] || "star"}
              size={32}
              color="white"
            />
          </LinearGradient>

          <Text style={styles.tag}>Breakthrough Detected</Text>
          <Text style={styles.title}>
            {data.axis.charAt(0).toUpperCase() + data.axis.slice(1)} Evolved
          </Text>

          <View style={styles.deltaBadge}>
            <Text style={styles.deltaText}>+{data.delta} Points</Text>
          </View>

          <Text style={styles.message}>{data.message}</Text>

          <View style={styles.scoreRow}>
            <Text style={styles.scoreLabel}>New Score</Text>
            <Text style={styles.scoreValue}>{data.newScore}</Text>
          </View>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={styles.actionButtonText}>Acknowledged</Text>
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
    shadowColor: "#6366F1",
    shadowOpacity: 0.3,
  },
  tag: {
    fontSize: 12,
    fontWeight: "800",
    color: "#6366F1",
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
  deltaBadge: {
    backgroundColor: "rgba(99, 102, 241, 0.1)",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 20,
  },
  deltaText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#6366F1",
  },
  message: {
    ...parseTextStyle(theme.typography.Body),
    fontSize: 15,
    color: theme.colors.text.default,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 28,
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
    marginBottom: 24,
  },
  scoreLabel: {
    fontSize: 14,
    color: theme.colors.text.disabled,
    fontWeight: "500",
  },
  scoreValue: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.text.title,
  },
  actionButton: {
    width: "100%",
    height: 54,
    borderRadius: 18,
    backgroundColor: "#0F172A",
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

export default BreakthroughModal;
