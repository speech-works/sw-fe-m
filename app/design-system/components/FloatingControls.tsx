import React from "react";
import { StyleProp, StyleSheet, TouchableOpacity, View, ViewStyle } from "react-native";
import { useTheme } from "../useTheme";
import { spacing, size } from "../primitives/scale";
import { Icon, IconName } from "./Icon";

/** Fixed offset of the control slot from the screen bottom — clears the global
 *  menu dock / internal menu docks. Shared by every screen so the primary
 *  floating control always lands in exactly the same spot. */
const DOCK_CLEARANCE = 110;

export interface FloatingControlItem {
  icon: IconName;
  onPress: () => void;
  /** Required — these are icon-only buttons. */
  accessibilityLabel: string;
  /** Fill override for accent-following screens (defaults to `action.primary`). */
  accentColor?: string;
  /** Icon ink paired with `accentColor` (defaults to `action.onPrimary`). */
  onAccentColor?: string;
}

export interface FloatingControlsProps {
  /**
   * 1–3 controls. `items[0]` is the primary — it sits in the canonical FAB slot
   * (the Community "+" / Library search position); additional items stack upward
   * above it. Extra items beyond 3 are ignored (warned in dev).
   */
  items: FloatingControlItem[];
  /** Layout-only escape hatch (e.g. extra bottom offset on inset-less screens). */
  style?: StyleProp<ViewStyle>;
}

/**
 * The single home for screen-level floating control buttons — the lower-right
 * slot above the menu dock (Community compose "+", Library search, Technique
 * info, Reframe shuffle). Renders as a fixed sibling of the screen's scroll view
 * (never inside it) so it stays put while content scrolls. Give scrollable
 * content enough bottom padding to clear the stack.
 */
export const FloatingControls: React.FC<FloatingControlsProps> = ({ items, style }) => {
  const { colors } = useTheme();

  if (__DEV__ && items.length > 3) {
    console.warn(`FloatingControls: expected at most 3 items, got ${items.length} — extras are ignored.`);
  }
  const shown = items.slice(0, 3);
  if (shown.length === 0) return null;

  return (
    <View style={[styles.stack, style]} pointerEvents="box-none">
      {shown.map((item, i) => (
        <TouchableOpacity
          key={i}
          style={[
            styles.control,
            {
              backgroundColor: item.accentColor ?? colors.action.primary,
              shadowColor: colors.shadow,
            },
          ]}
          activeOpacity={0.85}
          onPress={item.onPress}
          accessibilityRole="button"
          accessibilityLabel={item.accessibilityLabel}
        >
          <Icon
            name={item.icon}
            size={size.tabIcon}
            color={item.onAccentColor ?? colors.action.onPrimary}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  // column-reverse anchors items[0] in the canonical slot; extras grow upward.
  stack: {
    position: "absolute",
    bottom: DOCK_CLEARANCE,
    right: spacing["2xl"],
    flexDirection: "column-reverse",
    gap: spacing.md,
  },
  control: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
});
