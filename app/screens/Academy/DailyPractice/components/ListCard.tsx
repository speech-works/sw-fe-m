import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import React from "react";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../../util/functions/parseStyles";
import { theme } from "../../../../Theme/tokens";
import Icon from "react-native-vector-icons/FontAwesome5";

export interface ListCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onPress: () => void;
  disabled?: boolean;
  noChevron?: boolean;
}

const ListCard = ({
  title,
  description,
  icon,
  onPress,
  disabled,
  noChevron,
}: ListCardProps) => {
  return (
    <TouchableOpacity
      style={[styles.container, disabled ? styles.disabledContainer : null]}
      onPress={onPress}
      disabled={disabled}
    >
      <View style={styles.contentContainer}>
        {icon}
        <View style={styles.textContainer}>
          <Text
            style={[
              styles.titleText,
              disabled ? styles.disabledTitleText : null,
            ]}
          >
            {title}
          </Text>
          <Text style={styles.descriptionText}>{description}</Text>
        </View>
      </View>
      {!disabled && !noChevron && (
        <Icon
          name="chevron-right"
          size={16}
          color={theme.colors.text.default}
        />
      )}
    </TouchableOpacity>
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
    ...parseShadowStyle(theme.shadow.elevation1),
  },
  contentContainer: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  textContainer: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    flexShrink: 1,
  },
  titleText: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
  },
  descriptionText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
  },
  disabledContainer: {
    backgroundColor: theme.colors.surface.disabled,
    opacity: 1,
    elevation: 0, // Android
    shadowColor: "transparent", // iOS
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
  },
  disabledTitleText: {
    color: theme.colors.text.default,
  },
});
