import React from "react";
import { StyleSheet, Text as RNText, View } from "react-native";
import PressableScale from "../../components/PressableScale";
import { useTheme } from "../useTheme";
import { radius, spacing } from "../primitives/scale";
import { fonts } from "../primitives/fonts";
import { haptics } from "../haptics";
import { Text } from "./Text";

/**
 * ===========================================================================
 * A QUESTION'S ANSWERS, AS A LIST (founder, 2026-11-05)
 * ---------------------------------------------------------------------------
 * Answers used to be buttons or chips laid side by side. Three across cut off
 * "Partly, like it happened, but smaller" mid-word, and a chip does not say
 * whether you may pick one or many. Every answer to a question is now a full
 * row: a round button when one answer is allowed, a square tick box when
 * several are. The words wrap; nothing is cut.
 *
 * It looks like the form screen's own choices (PackFormScreen,
 * MultipleChoiceField), so a question reads the same wherever it is asked.
 * ===========================================================================
 */
export interface ChoiceOption {
  key: string;
  label: string;
  /** A second, quieter line, for an example. */
  hint?: string;
  /** Shown but not pickable, for example when a cap is reached. */
  disabled?: boolean;
}

export interface ChoiceListProps {
  options: ChoiceOption[];
  /** The keys that are picked. */
  selected: readonly string[];
  /** Square tick boxes, several allowed. Otherwise round buttons, one answer. */
  multiple?: boolean;
  onToggle: (key: string) => void;
  /** Ring and fill colour. The brand colour when left out. */
  accent?: string;
  /** Tick colour on the accent fill. */
  onAccent?: string;
  disabled?: boolean;
  /** Read out before each answer, for example the goal it belongs to. */
  accessibilityPrefix?: string;
}

export function ChoiceList({
  options,
  selected,
  multiple = false,
  onToggle,
  accent,
  onAccent,
  disabled = false,
  accessibilityPrefix,
}: ChoiceListProps) {
  const { colors } = useTheme();
  const ring = accent ?? colors.action.primary;
  const tick = onAccent ?? colors.action.onPrimary;

  return (
    <View style={styles.list} accessibilityRole={multiple ? undefined : "radiogroup"}>
      {options.map((option) => {
        const on = selected.includes(option.key);
        const off = disabled || !!option.disabled;
        return (
          <PressableScale
            key={option.key}
            disabled={off}
            onPress={() => {
              haptics.light();
              onToggle(option.key);
            }}
            accessibilityRole={multiple ? "checkbox" : "radio"}
            accessibilityState={multiple ? { checked: on, disabled: off } : { selected: on, disabled: off }}
            accessibilityLabel={[accessibilityPrefix, option.label, option.hint]
              .filter(Boolean)
              .join(", ")}
            style={[
              styles.row,
              {
                backgroundColor: colors.surface.control,
                borderColor: on ? ring : colors.border.default,
                opacity: off ? 0.5 : 1,
              },
            ]}
          >
            <View
              style={[
                styles.mark,
                multiple && styles.tickBox,
                { borderColor: on ? ring : colors.border.strong },
                multiple && on && { backgroundColor: ring },
              ]}
            >
              {on && !multiple ? <View style={[styles.dot, { backgroundColor: ring }]} /> : null}
              {on && multiple ? <RNText style={[styles.tick, { color: tick }]}>✓</RNText> : null}
            </View>
            <View style={styles.words}>
              <Text variant="body" color={on ? "primary" : "secondary"}>
                {option.label}
              </Text>
              {option.hint ? (
                <Text variant="caption" color="tertiary">
                  {option.hint}
                </Text>
              ) : null}
            </View>
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.md,
  },
  mark: {
    width: 22,
    height: 22,
    borderRadius: radius.full,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  tickBox: { borderRadius: radius.xs },
  dot: { width: 12, height: 12, borderRadius: radius.full },
  tick: { fontSize: 14, lineHeight: 16, fontFamily: fonts.bold },
  words: { flex: 1, gap: 2 },
});
