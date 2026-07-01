import React from "react";
import { View } from "react-native";
import Animated from "react-native-reanimated";
import PressableScale from "../../../../../components/PressableScale";
import {
  Icon,
  Text,
  makeStyles,
  radius,
  spacing,
  useMotion,
  useTheme,
} from "../../../../../design-system";
import { RichText } from "./RichText";
import type { ChatSessionOption } from "./types";

interface SuggestionCardsProps<O extends ChatSessionOption> {
  options: O[];
  /** The option the user has armed (tapped) for this turn. */
  armedOptionId: string | null;
  onArm: (option: O) => void;
  disabled?: boolean;
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
              style={[styles.card, armed && styles.cardArmed]}
            >
              <View style={[styles.radio, armed && styles.radioArmed]}>
                {armed ? (
                  <Icon name="check" size={14} color={colors.action.onPrimary} />
                ) : null}
              </View>
              <View style={styles.cardBody}>
                <RichText
                  text={option.userLine}
                  color={colors.text.primary}
                  align="start"
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
  radio: {
    width: 22,
    height: 22,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: c.border.strong,
    alignItems: "center",
    justifyContent: "center",
  },
  radioArmed: {
    backgroundColor: c.action.primary,
    borderColor: c.action.primary,
  },
  cardBody: {
    flex: 1,
  },
}));
