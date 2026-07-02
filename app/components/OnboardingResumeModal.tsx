import React from "react";
import { StyleSheet, View } from "react-native";
import {
  Sheet,
  Text,
  Button,
  Icon,
  useTheme,
  radius,
  spacing,
} from "../design-system";

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
  const { colors } = useTheme();

  return (
    <Sheet visible={visible} onClose={onDismiss || onResume}>
      <View style={styles.container}>
        <View style={[styles.iconDisc, { backgroundColor: colors.action.primaryTint }]}>
          <Icon name="bookmark" size={28} color={colors.action.primary} />
        </View>

        <Text variant="h2" center>
          Welcome Back!
        </Text>
        <Text variant="bodySm" color="secondary" center>
          You have an onboarding in progress. Would you like to resume?
        </Text>

        <View style={styles.buttons}>
          <Button label="Resume" onPress={onResume} />
          <Button label="Start Over" variant="ghost" onPress={onStartOver} />
        </View>
      </View>
    </Sheet>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
  iconDisc: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  buttons: {
    width: "100%",
    gap: spacing.md,
    marginTop: spacing.xs,
  },
});

export default OnboardingResumeModal;
