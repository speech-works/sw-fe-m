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
import Icon from "react-native-vector-icons/FontAwesome5";
import { theme } from "../Theme/tokens";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../util/functions/parseStyles";

interface LowFreeActivityModalProps {
  visible: boolean;
  onClose: () => void;
}

export const LowFreeActivityModal: React.FC<LowFreeActivityModalProps> = ({
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
  }, [visible, opacityAnim, scaleAnim]);

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
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <MaterialCommunityIcons
              name="close"
              size={20}
              color={theme.colors.text.disabled}
            />
          </TouchableOpacity>

          <LinearGradient
            colors={["#F59E0B", "#F97316"]}
            style={styles.iconContainer}
          >
            <Icon name="flag-checkered" size={28} color="#FFF" solid />
          </LinearGradient>

          <Text style={styles.tag}>Free Activity Alert</Text>
          <Text style={styles.title}>One Free Activity Left</Text>
          <Text style={styles.message}>
            You have one free activity left for today. Use it when it matters
            most, and your free activity count will refresh tomorrow.
          </Text>

          <TouchableOpacity
            style={styles.actionButtonContainer}
            onPress={onClose}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={["#F59E0B", "#F97316"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.actionButtonGradient}
            >
              <Text style={styles.actionButtonText}>
                Thanks for the heads-up
              </Text>
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
    shadowColor: "#F59E0B",
    shadowOpacity: 0.3,
  },
  tag: {
    fontSize: 12,
    fontWeight: "800",
    color: "#F59E0B",
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
    shadowColor: "#F59E0B",
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

export default LowFreeActivityModal;
