import React from "react";
import { View } from "react-native";
import Animated from "react-native-reanimated";
import PressableScale from "../../../../../components/PressableScale";
import {
  Text,
  borderWidth,
  makeStyles,
  radius,
  spacing,
  useMotion,
  useTheme,
  withAlpha,
} from "../../../../../design-system";
import { RichText } from "./RichText";
import type { ChatSessionOption } from "./types";

interface SuggestionCardsProps<O extends ChatSessionOption> {
  options: O[];
  /** The option the user has armed (tapped) for this turn. */
  armedOptionId: string | null;
  onArm: (option: O) => void;
  disabled?: boolean;
  /** Category accent for the armed card + radio (defaults to brand orange). */
  accentColor?: string;
  onAccentColor?: string;
}

/**
 * The turn's response options, rendered inline in the conversation as a clearly
 * tappable CHOICE list (a section label + a leading radio on each card) so they
 * never read as passive message bubbles. Tapping arms a card — the user then
 * speaks it in the dock to advance. Cards enter with a stagger.
 */
export function SuggestionCards<O extends ChatSessionOption>({
  options,
  armedOptionId,
  onArm,
  disabled,
  accentColor,
  onAccentColor,
}: SuggestionCardsProps<O>) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { stagger } = useMotion();

  if (options.length === 0) return null;

  return (
    <View style={styles.group}>
      <Text variant="label" color="tertiary" style={styles.label}>
        Choose your reply
      </Text>

      {options.map((option, i) => {
        const armed = option.id === armedOptionId;
        return (
          <Animated.View key={option.id} entering={stagger(i)}>
            <PressableScale
              onPress={() => onArm(option)}
              disabled={disabled}
              style={[
                styles.card,
                armed && styles.cardArmed,
                armed && accentColor
                  ? { backgroundColor: withAlpha(accentColor, 0.12), borderColor: accentColor }
                  : null,
              ]}
            >
              <View
                style={[
                  styles.radio,
                  armed && styles.radioArmed,
                  armed && accentColor ? { borderColor: accentColor } : null,
                ]}
              >
                {armed ? (
                  <View
                    style={[
                      styles.radioDot,
                      accentColor ? { backgroundColor: accentColor } : null,
                    ]}
                  />
                ) : null}
              </View>
              <View style={styles.cardBody}>
                <RichText
                  text={option.userLine}
                  color={colors.text.primary}
                  align="start"
                  accentColor={accentColor}
                  onAccentColor={onAccentColor}
                />
              </View>
            </PressableScale>
          </Animated.View>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  group: {
    alignSelf: "stretch",
    gap: spacing.md,
  },
  label: {
    marginLeft: spacing.xs,
    marginBottom: spacing.xxs,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.card,
    backgroundColor: c.surface.control,
    borderWidth: 1,
    borderColor: c.border.default,
    overflow: "hidden",
  },
  cardArmed: {
    backgroundColor: c.action.primaryTint,
    borderColor: c.action.primary,
  },
  // Matches the DS Radio spec exactly (22 circle, thick ring, 11 inner dot).
  radio: {
    width: 22,
    height: 22,
    borderRadius: radius.full,
    borderWidth: borderWidth.thick,
    borderColor: c.border.strong,
    alignItems: "center",
    justifyContent: "center",
  },
  radioArmed: {
    borderColor: c.action.primary,
  },
  radioDot: {
    width: 11,
    height: 11,
    borderRadius: radius.full,
    backgroundColor: c.action.primary,
  },
  cardBody: {
    flex: 1,
  },
}));
