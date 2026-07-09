import React from "react";
import { StyleSheet, View } from "react-native";
import Icon from "react-native-vector-icons/FontAwesome5";
import {
  AnimatedModal,
  Button,
  Gradient,
  Text,
  radius,
  spacing,
  useTheme,
} from "../design-system";

interface LowFreeActivityModalProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Gentle "one free activity left for today" heads-up (no upsell/paywall). Dark DS
 * card via `AnimatedModal` with the warm `brand` energy disc; the single CTA and a
 * backdrop tap both dismiss it, so there's no redundant close X.
 */
export const LowFreeActivityModal: React.FC<LowFreeActivityModalProps> = ({
  visible,
  onClose,
}) => {
  const { colors } = useTheme();

  return (
    <AnimatedModal visible={visible} onClose={onClose} maxWidth={380}>
      <View style={styles.content}>
        <Gradient token="brand" style={styles.iconDisc}>
          <Icon
            name="flag-checkered"
            size={28}
            color={colors.action.onPrimary}
            solid
          />
        </Gradient>

        <Text variant="label" color="accent" style={styles.eyebrow}>
          FREE ACTIVITY ALERT
        </Text>
        <Text variant="h2" color="primary" center>
          One Free Activity Left
        </Text>
        <Text variant="body" color="secondary" center style={styles.message}>
          You have one free activity left for today. Use it when it matters most,
          and your free activity count will refresh tomorrow.
        </Text>

        <Button label="Thanks for the heads-up" onPress={onClose} style={styles.cta} />
      </View>
    </AnimatedModal>
  );
};

export default LowFreeActivityModal;

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
