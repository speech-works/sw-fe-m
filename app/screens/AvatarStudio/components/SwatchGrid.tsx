import React from "react";
import { StyleSheet, View } from "react-native";
import PressableScale from "../../../components/PressableScale";
import { useTheme, spacing, radius, borderWidth } from "../../../design-system";

interface SwatchGridProps {
  swatches: { label: string; hex: string }[];
  selectedHex: string;
  onSelect: (hex: string) => void;
}

/**
 * A row of color swatches (skin / hair / backdrop). The swatch IS its color —
 * hexes here are catalog data flowing into the avatar manifest, not UI theme,
 * which is why they don't come from tokens.
 */
export const SwatchGrid: React.FC<SwatchGridProps> = ({
  swatches,
  selectedHex,
  onSelect,
}) => {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      {swatches.map((s) => {
        const selected = s.hex === selectedHex;
        return (
          <PressableScale
            key={s.hex}
            onPress={() => onSelect(s.hex)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={s.label}
            style={[
              styles.swatchHit,
              selected && {
                borderColor: colors.action.primary,
                borderWidth: borderWidth.thick,
              },
            ]}
          >
            <View
              style={[
                styles.swatch,
                { backgroundColor: s.hex, borderColor: colors.border.strong },
              ]}
            />
          </PressableScale>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: spacing.md,
  },
  // 44pt hit target; the visible swatch sits inside so the selection ring has
  // room without shifting the layout.
  swatchHit: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: borderWidth.thick,
    borderColor: "transparent",
  },
  swatch: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
