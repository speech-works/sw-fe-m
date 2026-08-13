import React from "react";
import { ActivityIndicator, Platform, StyleProp, ViewStyle } from "react-native";
import PressableScale from "../../components/PressableScale";
import { useTheme } from "../useTheme";
import { radius, hitTarget } from "../primitives/scale";
import { Icon, IconName } from "./Icon";
import { Text } from "./Text";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type ButtonSize = "sm" | "md" | "lg";

const HEIGHT: Record<ButtonSize, number> = { sm: 40, md: 48, lg: 56 };
const PADX: Record<ButtonSize, number> = { sm: 16, md: 20, lg: 24 };

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  leftIcon?: IconName;
  rightIcon?: IconName;
  /** Stretch to container width (default) or hug content. */
  fullWidth?: boolean;
  /** Ink for the `ghost`/`outline` text + border when the button sits on a
   *  bright/custom fill (e.g. an accent-coloured Sheet) — pass the AA-correct
   *  on-fill colour (`accentOn.*`). Solid variants stay dark and ignore this. */
  onColor?: string;
  /** Override the primary fill for context-themed flows. */
  accentColor?: string;
  /** AA-correct foreground for `accentColor`. */
  onAccentColor?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Primary action primitive. Dark-on-bright per the AA rule; pill radius; press
 * feedback via PressableScale (reduced-motion aware). One primary CTA per screen.
 */
export const Button: React.FC<ButtonProps> = ({
  label,
  onPress,
  variant = "primary",
  size = "lg",
  loading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  fullWidth = true,
  onColor,
  accentColor,
  onAccentColor,
  style,
}) => {
  const { colors } = useTheme();
  const isDisabled = disabled || loading;

  let bg = accentColor ?? colors.action.primary;
  let fg = onAccentColor ?? colors.action.onPrimary;
  let borderColor: string | undefined;

  if (variant === "primary") {
    // A filled button needs an identifiable boundary (WCAG 1.4.11, 3:1). The
    // orange fill is 8.24:1 on the ink canvas and 2.02:1 on paper, so this
    // resolves to "transparent" on dark and a real edge on light. Only the
    // DEFAULT fill gets it — a threaded `accentColor` is an arbitrary hue with
    // no matching edge cut, and guessing one is worse than leaving it alone.
    if (!accentColor && colors.action.primaryEdge !== "transparent") {
      borderColor = colors.action.primaryEdge;
    }
  } else if (variant === "secondary") {
    bg = colors.action.secondary;
    fg = colors.action.onSecondary;
  } else if (variant === "ghost") {
    bg = "transparent";
    fg = onColor ?? colors.action.primary;
  } else if (variant === "outline") {
    bg = "transparent";
    fg = onColor ?? colors.action.primary;
    borderColor = onColor ?? colors.action.primary;
  } else if (variant === "danger") {
    bg = "transparent";
    fg = colors.feedback.dangerText;
    borderColor = colors.accent.danger;
  }

  if (isDisabled) {
    bg = bg === "transparent" ? "transparent" : colors.action.disabledBg;
    fg = colors.action.disabledText;
    borderColor = borderColor ? colors.action.disabledText : undefined;
  }

  const containerStyle: ViewStyle = {
    height: HEIGHT[size],
    minHeight: hitTarget.min,
    paddingHorizontal: PADX[size],
    borderRadius: radius.pill,
    backgroundColor: bg,
    borderWidth: borderColor ? 1 : 0,
    borderColor,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    alignSelf: fullWidth ? "stretch" : "flex-start",
  };

  return (
    <PressableScale
      onPress={isDisabled ? undefined : onPress}
      disabled={isDisabled}
      style={[containerStyle, style]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {leftIcon ? <Icon name={leftIcon} size={20} color={fg} /> : null}
          {/* center + single line: a button label must never wrap or left-align
              (an un-centered wrapped label is the classic cramped-button defect).

              flexShrink: RN defaults it to 0 (not 1 like the web), so in this
              row the label could not give way — with an icon beside it, an
              11-character label was overflowing a button with ~290pt to spare.
              Shrinking makes the row share width properly; minWidth guards the
              usual flexbox min-content floor.

              adjustsFontSizeToFit is iOS-ONLY on purpose. RN Android maps it to
              TextView auto-size, which locks its shrink factor to whatever the
              first measurement said. When that measurement was taken against the
              fallback font, the real glyphs draw wider than the box and — being
              centred — get sliced at BOTH ends ("Let's start" -> "et's star"),
              which is far worse than an honest ellipsis. Android now shrinks by
              flex and ellipsizes as a last resort. iOS behaviour is unchanged. */}
          <Text
            variant="title"
            color={fg}
            center
            numberOfLines={1}
            adjustsFontSizeToFit={Platform.OS === "ios"}
            minimumFontScale={0.7}
            style={{ flexShrink: 1, minWidth: 0 }}
          >
            {label}
          </Text>
          {rightIcon ? <Icon name={rightIcon} size={20} color={fg} /> : null}
        </>
      )}
    </PressableScale>
  );
};
