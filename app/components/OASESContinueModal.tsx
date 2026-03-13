import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Icon from "react-native-vector-icons/Feather";
import { theme } from "../Theme/tokens";
import { parseTextStyle } from "../util/functions/parseStyles";
import BottomSheetModal from "./BottomSheetModal";
import Button from "./Button";

interface OASESContinueModalProps {
  visible: boolean;
  remainingQuestions: number;
  onContinue: () => void;
  onSaveForLater: () => void;
}

const OASESContinueModal: React.FC<OASESContinueModalProps> = ({
  visible,
  remainingQuestions,
  onContinue,
  onSaveForLater,
}) => {
  // If assessment is complete, don't show this modal
  if (remainingQuestions === 0) {
    return null;
  }

  return (
    <BottomSheetModal
      visible={visible}
      onClose={onSaveForLater}
      showCloseButton={true}
    >
      <View style={styles.container}>
        {/* Celebration Icon */}
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <Icon name="check" size={32} color="#10B981" />
          </View>
        </View>

        {/* Title & Subtitle */}
        <Text style={styles.title}>Great job!</Text>
        <Text style={styles.subtitle}>You completed this set.</Text>

        {/* Remaining Info */}
        <View style={styles.remainingBadge}>
          <Icon name="clock" size={14} color={theme.colors.text.default} />
          <Text style={styles.remainingText}>
            {remainingQuestions} question{remainingQuestions !== 1 ? "s" : ""}{" "}
            remaining
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <Button
            text="Continue Now"
            onPress={onContinue}
            style={styles.continueButton}
          />
          <Button
            text="Save for Later"
            variant="ghost"
            onPress={onSaveForLater}
            textColor={theme.colors.text.default}
          />
        </View>
      </View>
    </BottomSheetModal>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 24,
    paddingBottom: 40,
    alignItems: "center",
  },
  iconContainer: {
    marginBottom: 16,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#D1FAE5", // Green 100
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    ...parseTextStyle(theme.typography.Heading2),
    color: theme.colors.text.title,
    marginBottom: 4,
  },
  subtitle: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
    marginBottom: 20,
  },
  remainingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.library.orange[100],
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
    marginBottom: 28,
  },
  remainingText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
    fontWeight: "600",
  },
  actions: {
    width: "100%",
    gap: 12,
  },
  continueButton: {
    width: "100%",
  },
});

export default OASESContinueModal;
