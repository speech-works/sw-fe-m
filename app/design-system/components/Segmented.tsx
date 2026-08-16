import React from "react";
import { StyleSheet, View } from "react-native";
import PressableScale from "../../components/PressableScale";
import { useTheme } from "../useTheme";
import { radius } from "../primitives/scale";
import { Text } from "./Text";

/**
 * A segment whose identity is separate from its words.
 *
 * The plain-string form is still the default and still right for most uses:
 * when the label IS the value there is nothing to keep in step. This form
 * exists for the two cases where that breaks down — a label carrying a count
 * that changes underneath it, and a label that will be translated — because in
 * both, comparing the visible text is comparing the wrong thing.
 */
export interface SegmentedOption {
  /** Stable identity. This, not the label, is what `onChange` returns. */
  key: string;
  label: string;
  /**
   * A count on the segment, sitting next to the word it counts. Zero and
   * undefined both render nothing: a badge showing "0" is a control reporting
   * its own emptiness.
   */
  badge?: number;
}

export interface SegmentedProps {
  /** Plain strings when the label is the value; {@link SegmentedOption}s when
   *  it is not. */
  options: readonly (string | SegmentedOption)[];
  /** The active segment's `key` (or its label, in the plain-string form). */
  value: string;
  onChange: (value: string) => void;
  /** Accent fill for the ACTIVE segment (e.g. the flow's `colors.accent.*`).
   *  Defaults to the neutral `surface.control` step. */
  accentColor?: string;
  /** AA-correct foreground for `accentColor` (`accentOn.*`). */
  onAccentColor?: string;
}

/** Segmented control — one active segment on a track. */
export const Segmented: React.FC<SegmentedProps> = ({
  options,
  value,
  onChange,
  accentColor,
  onAccentColor,
}) => {
  const { colors, elevation } = useTheme();
  // One shape downstream, so the render below never has to ask which form it
  // was given.
  const items: SegmentedOption[] = options.map((o) =>
    typeof o === "string" ? { key: o, label: o } : o,
  );
  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: colors.surface.default,
        borderRadius: radius.chip,
        padding: 4,
        gap: 4,
      }}
    >
      {items.map((opt) => {
        const active = opt.key === value;
        // Default active segment = the (deepened) control fill + a defined edge +
        // a soft shadow, so it reads as a raised, filled thumb on the track in
        // both schemes (a same-tone fill alone vanishes on paper). When an
        // accentColor is supplied it stays a bright accent fill (already legible).
        const activeStyle = accentColor
          ? { backgroundColor: accentColor }
          : {
              backgroundColor: colors.surface.control,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: colors.border.strong,
              ...elevation.e2,
            };
        return (
          <PressableScale
            key={opt.key}
            onPress={() => onChange(opt.key)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={
              opt.badge ? `${opt.label}, ${opt.badge}` : opt.label
            }
            style={{
              flex: 1,
              height: 38,
              borderRadius: radius.chip - 4,
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              gap: 6,
              ...(active ? activeStyle : { backgroundColor: "transparent" }),
            }}
          >
            <Text
              variant="bodySm"
              color={
                active
                  ? accentColor
                    ? onAccentColor ?? "primary"
                    : "primary"
                  : "tertiary"
              }
            >
              {opt.label}
            </Text>
            {/* The count, as a chip rather than more words. Tinted on the
                active segment so it reads against the raised thumb, and on the
                track's own step otherwise. */}
            {opt.badge ? (
              <View
                style={{
                  minWidth: 20,
                  paddingHorizontal: 6,
                  paddingVertical: 1,
                  borderRadius: radius.full,
                  backgroundColor: active
                    ? colors.action.primaryTint
                    : colors.surface.control,
                  alignItems: "center",
                }}
              >
                <Text variant="caption" color={active ? "accent" : "tertiary"}>
                  {opt.badge > 9 ? "9+" : opt.badge}
                </Text>
              </View>
            ) : null}
          </PressableScale>
        );
      })}
    </View>
  );
};
