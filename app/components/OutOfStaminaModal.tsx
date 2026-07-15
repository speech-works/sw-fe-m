import React from "react";
import { StyleSheet, View } from "react-native";
import {
  AnimatedModal,
  Button,
  Gradient,
  Icon,
  Text,
  icons,
  radius,
  spacing,
} from "../design-system";

interface OutOfStaminaModalProps {
  visible: boolean;
  onClose: () => void;
  /** Recharge / reset copy, computed by the controller (paid vs free). */
  message: string;
}

/**
 * Hard-block acknowledgment shown when a practice start is refused because the
 * user is out of energy (or has used their free sessions for the day). Unlike
 * {@link ./LowStaminaModal} — a soft "you're getting low" nudge — this fires the
 * moment a start is actually blocked, so the tap that seemed to do nothing gets
 * an explanation. No paywall while monetization is dormant; it's purely
 * informational (mirrors LowStaminaModal's warm `sunrise` card).
 */
export const OutOfStaminaModal: React.FC<OutOfStaminaModalProps> = ({
  visible,
  onClose,
  message,
}) => {
  return (
    <AnimatedModal visible={visible} onClose={onClose} maxWidth={380} exclusive>
      <View style={styles.content}>
        <Gradient token="sunrise" style={styles.iconDisc}>
          <Icon name={icons.energy} size={30} color="#FFFFFF" />
        </Gradient>

        <Text variant="label" color="accent" style={styles.eyebrow}>
          OUT OF ENERGY
        </Text>
        <Text variant="h2" color="primary" center>
          Time for a Breather
        </Text>
        <Text variant="body" color="secondary" center style={styles.message}>
          {message}
        </Text>

        <Button label="Got It" onPress={onClose} style={styles.cta} />
      </View>
    </AnimatedModal>
  );
};

export default OutOfStaminaModal;

const styles = StyleSheet.create({
  content: {
    alignItems: "center",
    gap: spacing.md,
  },
  iconDisc: {
    width: 64,
    height: 64,
    borderRadius: radius.input,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginBottom: spacing.xs,
  },
  eyebrow: {
    letterSpacing: 1.5,
  },
  message: {
    lineHeight: 22,
  },
  cta: {
    marginTop: spacing.sm,
  },
});
