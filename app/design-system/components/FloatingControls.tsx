import React from "react";
import { StyleProp, StyleSheet, TouchableOpacity, View, ViewStyle } from "react-native";
import { useTheme } from "../useTheme";
import { useNavBarInset } from "../useNavBarInset";
import { spacing, size } from "../primitives/scale";
import { castShadow, type CastShadowSpec } from "../elevation";
import { Icon, IconName } from "./Icon";

/** Fixed offset of the control slot from the screen bottom — clears the global
 *  menu dock / internal menu docks. Shared by every screen so the primary
 *  floating control always lands in exactly the same spot. */
const DOCK_CLEARANCE = 110;

/** The canonical floating-control footprint. Exported so custom slots (a pager,
 *  a toggle) can match the icon buttons exactly. */
export const FLOATING_CONTROL_SIZE = 46;
export const floatingControlSurface: ViewStyle = {
  width: FLOATING_CONTROL_SIZE,
  borderRadius: 14,
};

/**
 * The shadow those controls cast. It can't live in the style above because its
 * colour is a theme role resolved at render time — every consumer pairs the
 * surface with `castShadow(colors.shadow, FLOATING_CONTROL_SHADOW)`.
 *
 * `blur: 16` is the CSS form of the `shadowRadius: 8` this used to carry.
 */
export const FLOATING_CONTROL_SHADOW: CastShadowSpec = {
  y: 4,
  blur: 16,
  alpha: 0.3,
  elevation: 6,
};

export interface FloatingControlButton {
  icon: IconName;
  onPress: () => void;
  /** Required — these are icon-only buttons. */
  accessibilityLabel: string;
  /** Fill override for accent-following screens (defaults to `action.primary`). */
  accentColor?: string;
  /** Icon ink paired with `accentColor` (defaults to `action.onPrimary`). */
  onAccentColor?: string;
}

/** A fully custom slot (e.g. a pager pill, a toggle) — style it with
 *  `floatingControlSurface` so it lines up with the icon buttons. */
export interface FloatingControlNode {
  key: string;
  render: React.ReactNode;
}

export type FloatingControlItem = FloatingControlButton | FloatingControlNode;

const isNode = (item: FloatingControlItem): item is FloatingControlNode =>
  "render" in item;

export interface FloatingControlsProps {
  /**
   * 1–3 controls. `items[0]` is the primary — it sits closest to the thumb (the
   * bottom of the stack, the Community "+" / Library search position); additional
   * items stack upward above it. Extra items beyond 3 are ignored (warned in dev).
   */
  items: FloatingControlItem[];
  /**
   * Embed in a measured/relative container (e.g. `ReadingStage`'s dock cluster)
   * instead of pinning to the absolute lower-right slot. The parent then owns
   * position + bottom clearance.
   */
  inline?: boolean;
  /** Layout-only escape hatch (e.g. a different bottom offset). */
  style?: StyleProp<ViewStyle>;
}

/**
 * The single home for screen-level floating control buttons — the lower-right
 * slot above the menu dock (Community compose "+", Library search, Technique
 * info, Reframe shuffle) and, in `inline` mode, the reading-practice control
 * stack. Renders as a fixed sibling of the screen's scroll view (never inside
 * it) so it stays put while content scrolls. `column-reverse` anchors `items[0]`
 * at the bottom; extras grow upward. Give scrollable content enough bottom
 * padding to clear the stack.
 */
export const FloatingControls: React.FC<FloatingControlsProps> = ({
  items,
  inline,
  style,
}) => {
  const { colors } = useTheme();
  // `inline` slots are positioned by their parent; only the absolute lower-right
  // slot is window-anchored and needs the nav bar added back. 0 on iOS.
  const navBarInset = useNavBarInset();

  if (__DEV__ && items.length > 3) {
    console.warn(`FloatingControls: expected at most 3 items, got ${items.length} — extras are ignored.`);
  }
  const shown = items.slice(0, 3);
  if (shown.length === 0) return null;

  return (
    <View
      style={[
        inline
          ? styles.stackInline
          : [styles.stack, { bottom: DOCK_CLEARANCE + navBarInset }],
        style,
      ]}
      pointerEvents="box-none"
    >
      {shown.map((item, i) =>
        isNode(item) ? (
          <React.Fragment key={item.key}>{item.render}</React.Fragment>
        ) : (
          <TouchableOpacity
            key={i}
            style={[
              styles.control,
              { backgroundColor: item.accentColor ?? colors.action.primary },
              castShadow(colors.shadow, FLOATING_CONTROL_SHADOW),
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
        ),
      )}
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
    alignItems: "flex-end",
    gap: spacing.md,
  },
  stackInline: {
    flexDirection: "column-reverse",
    alignItems: "flex-end",
    gap: spacing.md,
  },
  control: {
    ...floatingControlSurface,
    height: FLOATING_CONTROL_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
});
