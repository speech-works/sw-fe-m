import React from "react";
import { TouchableOpacity, View } from "react-native";
import {
  Gradient,
  Icon,
  Text,
  makeStyles,
  opacity,
  radius,
  size,
  spacing,
  useTheme,
} from "../../../../design-system";

export interface GradientActionCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onPress: () => void;
  disabled?: boolean;
  noChevron?: boolean;
  gradientColors?: readonly [string, string];
}

const GradientActionCard = ({
  title,
  description,
  icon,
  onPress,
  disabled,
  noChevron,
  gradientColors,
}: GradientActionCardProps) => {
  const { colors } = useTheme();
  const styles = useStyles();

  return (
    <TouchableOpacity
      style={[styles.container, disabled ? styles.disabledContainer : null]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.9}
    >
      <Gradient
        // Default = the brand (orange) ramp; callers may still pass a custom duo.
        token="brand"
        colors={
          disabled
            ? [colors.action.disabledBg, colors.action.disabledBg]
            : gradientColors
        }
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
              variant="h3"
              color={disabled ? "secondary" : colors.action.onPrimary}
            >
              {title}
            </Text>
            <Text
              variant="bodySm"
              color={disabled ? "tertiary" : colors.action.onPrimary}
            >
              {description}
            </Text>
          </View>
        </View>
        {!disabled && !noChevron && (
          <View style={styles.chevronContainer}>
            <Icon
              name="chevron-right"
              size={size.iconSm}
              color={colors.text.onInverse}
            />
          </View>
        )}
      </Gradient>
    </TouchableOpacity>
  );
};

export default GradientActionCard;

const useStyles = makeStyles((c, t) => ({
  container: {
    borderRadius: radius.card,
    overflow: "hidden",
    ...t.elevation.e2,
  },
  gradient: {
    padding: spacing.xl,
    paddingVertical: spacing["2xl"],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    position: "relative",
    borderRadius: radius.card,
  },
  bubble: {
    position: "absolute",
    borderRadius: radius.full,
    backgroundColor: c.surface.inverse,
    opacity: opacity.faint,
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
  },
  contentContainer: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    flex: 1,
    zIndex: 1,
  },
  iconWrapper: {},
  textContainer: {
    display: "flex",
    flexDirection: "column",
    gap: spacing.xs,
    flexShrink: 1,
  },
  chevronContainer: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: c.surface.inverse,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  disabledContainer: {
    opacity: opacity.pressed,
  },
}));
