import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import React from "react";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../../util/functions/parseStyles";
import { theme } from "../../../../Theme/tokens";
import Icon from "react-native-vector-icons/FontAwesome5";
import { LinearGradient } from "expo-linear-gradient";

export interface ListCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onPress: () => void;
  disabled?: boolean;
  noChevron?: boolean;
  gradientColors?: readonly [string, string];
}

const ListCard = ({
  title,
  description,
  icon,
  onPress,
  disabled,
  noChevron,
  gradientColors = ["#FFFFFF", "#FAFBFC"],
}: ListCardProps) => {
  return (
    <TouchableOpacity
      style={[styles.container, disabled ? styles.disabledContainer : null]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.9}
    >
      <LinearGradient
        colors={disabled ? ["#F8FAFC", "#F1F5F9"] : gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Decorative Bubbles */}
        {!disabled && (
          <>
            <View style={[styles.bubble, styles.bubbleTopRight]} />
            <View style={[styles.bubble, styles.bubbleBottomLeft]} />
          </>
        )}

        <View style={styles.contentContainer}>
          <View style={styles.iconWrapper}>{icon}</View>
          <View style={styles.textContainer}>
            <Text
              style={[
                styles.titleText,
                disabled ? styles.disabledTitleText : null,
              ]}
            >
              {title}
            </Text>
            <Text
              style={[
                styles.descriptionText,
                !disabled && styles.colorfulDescription,
              ]}
            >
              {description}
            </Text>
          </View>
        </View>
        {!disabled && !noChevron && (
          <View style={styles.chevronContainer}>
            <Icon
              name="chevron-right"
              size={16}
              color="rgba(255,255,255,0.9)"
            />
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
};

export default ListCard;

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    overflow: "hidden",
    ...parseShadowStyle(theme.shadow.elevation2),
  },
  gradient: {
    padding: 20,
    paddingVertical: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    position: "relative",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.03)",
    borderRadius: 24,
  },
  bubble: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  bubbleTopRight: {
    top: -20,
    right: -20,
    width: 80,
    height: 80,
  },
  bubbleBottomLeft: {
    bottom: -10,
    left: -15,
    width: 60,
    height: 60,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
  },
  contentContainer: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    flex: 1,
    zIndex: 1,
  },
  iconWrapper: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  textContainer: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    flexShrink: 1,
  },
  titleText: {
    ...parseTextStyle(theme.typography.Heading3),
    color: "#FFF",
    fontSize: 18,
    fontWeight: "700",
  },
  descriptionText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: "rgba(255,255,255,0.85)",
    lineHeight: 20,
  },
  colorfulDescription: {
    color: "rgba(255,255,255,0.9)",
    fontWeight: "500",
  },
  chevronContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  disabledContainer: {
    opacity: 0.6,
  },
  disabledTitleText: {
    color: theme.colors.text.default,
  },
});
