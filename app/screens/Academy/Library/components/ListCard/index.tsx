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
}

const ListCard = ({
  title,
  description,
  level,
  onExerciseSelect,
  onTutorialSelect,
  disabled,
}: ListCardProps) => {
  return (
    <View
      style={[styles.container, disabled ? styles.disabledContainer : null]}
    >
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
          <TouchableOpacity
            onPress={onTutorialSelect}
            style={[
              styles.buttonTouch,
              { backgroundColor: theme.colors.library.orange[100] },
            ]}
          >
            <Icon
              name="play"
              size={14}
              color={theme.colors.library.orange[400]}
            />
            <Text
              style={[
                styles.buttonText,
                { color: theme.colors.library.orange[400] },
              ]}
            >
              Tutorial
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onExerciseSelect}
            style={[
              styles.buttonTouch,
              { backgroundColor: theme.colors.library.blue[100] },
            ]}
          >
            <Icon
              name="dumbbell"
              size={14}
              color={theme.colors.library.blue[400]}
            />
            <Text
              style={[
                styles.buttonText,
                { color: theme.colors.library.blue[400] },
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
    //...parseShadowStyle(theme.shadow.elevation1),
  },
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
    ...parseShadowStyle(theme.shadow.elevation1),
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
