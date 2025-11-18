import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import React from "react";

import Icon from "react-native-vector-icons/FontAwesome5";
import { theme } from "../../../../../Theme/tokens";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../../../util/functions/parseStyles";

export interface ListCardProps {
  title: string;
  description: string;
  level: string;
  onTutorialSelect: () => void;
  onExerciseSelect: () => void;
  disabled?: boolean;
  hasFree?: boolean;
  isPaidUser?: boolean; // Added prop to check subscription status
}

const ListCard = ({
  title,
  description,
  level,
  onExerciseSelect,
  onTutorialSelect,
  disabled,
  hasFree,
  isPaidUser,
}: ListCardProps) => {
  // Check if badge is active to apply extra padding
  const showBadge = hasFree && !disabled;

  // Logic: Lock exercise if content is NOT free AND user is NOT paid
  // We also assume if the whole card is disabled, the button is disabled implicitly
  const isExerciseLocked = !hasFree && !isPaidUser;

  return (
    <View
      style={[
        styles.container,
        disabled ? styles.disabledContainer : null,
        showBadge ? styles.containerWithBadge : null,
      ]}
    >
      {/* --- Free Content Badge (Top Left) --- */}
      {showBadge && (
        <View style={styles.badgeContainer}>
          <Text style={styles.badgeText}>FREE CONTENT</Text>
        </View>
      )}

      <View style={styles.contentContainer}>
        <View style={styles.textContainer}>
          <View style={styles.rowContainer}>
            <Text
              style={[
                styles.titleText,
                disabled ? styles.disabledTitleText : null,
              ]}
            >
              {title}
            </Text>
            <View style={styles.levelChip}>
              <Text style={styles.levelText}>{level}</Text>
            </View>
          </View>
          <Text style={styles.descriptionText}>{description}</Text>
        </View>

        <View style={styles.buttonContainer}>
          {/* Tutorial Button - Always available (unless card is disabled) */}
          <TouchableOpacity
            onPress={onTutorialSelect}
            disabled={disabled}
            style={[
              styles.buttonTouch,
              { backgroundColor: theme.colors.library.orange[400] },
            ]}
          >
            <Icon name="play" size={14} color={theme.colors.text.onDark} />
            <Text
              style={[styles.buttonText, { color: theme.colors.text.onDark }]}
            >
              Tutorial
            </Text>
          </TouchableOpacity>

          {/* Exercise Button - Conditionally Locked */}
          <TouchableOpacity
            onPress={isExerciseLocked ? undefined : onExerciseSelect}
            disabled={disabled || isExerciseLocked}
            style={[
              styles.buttonTouch,
              // Default Style
              {
                backgroundColor: theme.colors.surface.elevated,
                borderColor: theme.colors.actionPrimary.default,
              },
              // Locked Style overwrites
              isExerciseLocked && styles.lockedButtonTouch,
            ]}
          >
            <Icon
              // Change icon to lock if locked
              name={isExerciseLocked ? "lock" : "dumbbell"}
              size={14}
              color={
                isExerciseLocked
                  ? theme.colors.text.disabled // Grey icon
                  : theme.colors.actionPrimary.default // Orange/Primary icon
              }
            />
            <Text
              style={[
                styles.buttonText,
                {
                  color: isExerciseLocked
                    ? theme.colors.text.disabled // Grey text
                    : theme.colors.actionPrimary.default, // Primary text
                },
              ]}
            >
              Exercise
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default ListCard;

const styles = StyleSheet.create({
  container: {
    padding: 24,
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 12,
    backgroundColor: theme.colors.surface.elevated,
    position: "relative",
    overflow: "hidden",
  },
  containerWithBadge: {
    paddingTop: 32,
  },
  // --- Badge Styles ---
  badgeContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    backgroundColor: "#4CAF50",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderBottomRightRadius: 10,
    zIndex: 10,
  },
  badgeText: {
    ...parseTextStyle(theme.typography.BodyDetails),
    fontSize: 10,
    fontWeight: "700",
    color: "#FFFFFF",
    textTransform: "uppercase",
  },
  // --------------------
  contentContainer: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
    flex: 1,
  },
  textContainer: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  rowContainer: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  levelChip: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 16,
    backgroundColor: theme.colors.surface.default,
  },
  levelText: {
    ...parseTextStyle(theme.typography.BodyDetails),
    color: theme.colors.text.default,
  },
  titleText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.title,
  },
  descriptionText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
  },
  buttonContainer: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  buttonTouch: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.surface.disabled,
    // borderColor is handled inline to support the conditional override easily
  },
  // New style for the locked state
  lockedButtonTouch: {
    backgroundColor: theme.colors.surface.disabled,
    borderColor: theme.colors.surface.disabled, // Removes the orange border
  },
  buttonText: {
    ...parseTextStyle(theme.typography.BodySmall),
  },
  disabledContainer: {
    backgroundColor: theme.colors.surface.disabled,
    boxShadow: "none",
  },
  disabledTitleText: {
    color: theme.colors.text.default,
  },
});
