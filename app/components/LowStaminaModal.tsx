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

interface LowStaminaModalProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * A gentle "you've practiced hard — take a break" acknowledgment shown once per
 * stamina-crossing event (no upsell/paywall). Dark DS card via `AnimatedModal`
 * with the warm `sunrise` energy disc; the single "I'll Be Back" CTA and a
 * backdrop tap both dismiss it, so there's no redundant close X.
 */
export const LowStaminaModal: React.FC<LowStaminaModalProps> = ({
  visible,
  onClose,
}) => {
  return (
    <AnimatedModal visible={visible} onClose={onClose} maxWidth={380}>
      <View style={styles.content}>
        <Gradient token="sunrise" style={styles.iconDisc}>
          <Icon name={icons.energy} size={30} color="#FFFFFF" />
        </Gradient>

        <Text variant="label" color="accent" style={styles.eyebrow}>
          LOW STAMINA
        </Text>
        <Text variant="h2" color="primary" center>
          Running on Empty
        </Text>
        <Text variant="body" color="secondary" center style={styles.message}>
          Your stamina is running low because you've practiced hard today! Take a
          well-deserved break to rest your voice, and come back stronger.
        </Text>

        <Button label="I'll Be Back" onPress={onClose} style={styles.cta} />
      </View>
    </AnimatedModal>
  );
};

export default LowStaminaModal;

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
