import React, { useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import Animated, {
  FadeIn,
  LinearTransition,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
  withSpring,
} from "react-native-reanimated";
import { useTheme } from "../useTheme";
import { fonts } from "../primitives/fonts";
import { size } from "../primitives/scale";
import { Icon, IconName } from "./Icon";

// One spring drives BOTH the active pill's growth (per item) AND the capsule's
// hug/resize (LinearTransition on the bar), so the pill and the dock move together
// — never the pill overflowing first and the dock catching up.
const DOCK_SPRING = { damping: 20, stiffness: 220, mass: 0.7 } as const;
import { Text } from "./Text";

export interface TabDockItem {
  key: string;
  /** Shown only when this tab is active (the expanding pill). */
  label: string;
  /** A DS icon name — prefer an `icons` registry key (e.g. `icons.home`). */
  icon: IconName;
  /** Optional unread/count badge. */
  badge?: number;
}

export interface TabDockProps {
  items: TabDockItem[];
  activeKey: string;
  onSelect: (key: string) => void;
  onLongPress?: (key: string) => void;
  /** Hug the tabs instead of filling the width (for in-page docks). */
  fitContent?: boolean;
  /** Render in normal flow (e.g. inside a header) instead of floating at the bottom. */
  inline?: boolean;
  /** Screen-reader label for the whole dock (e.g. "Main navigation" /
   *  "Community page tabs"). Announced politely when it changes. */
  accessibilityLabel?: string;
}

/**
 * The floating menu dock — a `surface.elevated` capsule whose active tab is an
 * orange pill (icon + label); inactive tabs are icon-only. This is the single
 * source for the app's bottom nav AND any in-page tab dock, so they never drift.
 * `fitContent` hugs the tabs (in-page) vs. filling the width (bottom nav).
 */
export const TabDock: React.FC<TabDockProps> = ({
  items,
  activeKey,
  onSelect,
  onLongPress,
  fitContent = false,
  inline = false,
  accessibilityLabel,
}) => {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  return (
    <View style={inline ? styles.containerInline : styles.container} pointerEvents="box-none">
      <Animated.View
        // The capsule resizes (hug content / nav↔tabs morph) on the SAME spring as
        // the active pill, so they stay locked together.
        layout={
          reduceMotion
            ? undefined
            : LinearTransition.springify()
                .damping(DOCK_SPRING.damping)
                .stiffness(DOCK_SPRING.stiffness)
                .mass(DOCK_SPRING.mass)
        }
        style={[
          styles.bar,
          fitContent ? styles.barFit : styles.barFull,
          { backgroundColor: colors.surface.elevated, shadowColor: colors.shadow },
        ]}
        accessibilityRole="tablist"
        accessibilityLabel={accessibilityLabel}
        accessibilityLiveRegion="polite"
      >
        {items.map((item) => (
          <DockItem
            key={item.key}
            isFocused={activeKey === item.key}
            label={item.label}
            iconName={item.icon}
            badge={item.badge ?? 0}
            fitContent={fitContent}
            reduceMotion={reduceMotion}
            onPress={() => onSelect(item.key)}
            onLongPress={onLongPress ? () => onLongPress(item.key) : undefined}
          />
        ))}
      </Animated.View>
    </View>
  );
};

interface DockItemProps {
  isFocused: boolean;
  label: string;
  iconName: IconName;
  badge: number;
  fitContent: boolean;
  reduceMotion: boolean;
  onPress: () => void;
  onLongPress?: () => void;
}

const DockItem: React.FC<DockItemProps> = ({
  isFocused,
  label,
  iconName,
  badge,
  fitContent,
  reduceMotion,
  onPress,
  onLongPress,
}) => {
  const { colors } = useTheme();
  const activeColor = colors.nav.activePill;
  const activeContentColor = colors.nav.onActive;
  const inactiveColor = colors.nav.inactive;
  const capsuleColor = colors.surface.elevated;

  const [labelWidth, setLabelWidth] = useState(0);
  // Estimate until the real width is measured, so the active label never pops in at 0.
  const targetWidth = labelWidth || Math.round(label.length * 8.2);

  const v = useDerivedValue(
    () => (reduceMotion ? (isFocused ? 1 : 0) : withSpring(isFocused ? 1 : 0, DOCK_SPRING)),
    [isFocused, reduceMotion],
  );

  // Full-width nav distributes space via flex; an in-page dock sizes to content.
  const containerStyle = useAnimatedStyle(() =>
    fitContent ? {} : { flex: interpolate(v.value, [0, 1], [1, 2.5]) },
  );
  const pillStyle = useAnimatedStyle(() => ({
    // Clamp the colour input so spring overshoot can't push it past the fill.
    backgroundColor: interpolateColor(Math.min(1, Math.max(0, v.value)), [0, 1], ["transparent", activeColor]),
    paddingHorizontal: Math.max(0, interpolate(v.value, [0, 1], [0, 18])),
  }));
  const textWrapperStyle = useAnimatedStyle(() => ({
    // max(0, …) absorbs spring undershoot so width/margin never go negative.
    width: Math.max(0, interpolate(v.value, [0, 1], [0, targetWidth])),
    marginLeft: Math.max(0, interpolate(v.value, [0, 1], [0, 8])),
    opacity: Math.max(0, Math.min(1, v.value)),
  }));
  const textStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(v.value, [0, 1], [0.85, 1]) }],
  }));
  const inactiveIconStyle = useAnimatedStyle(() => ({ position: "absolute", opacity: 1 - v.value }));
  const activeIconStyle = useAnimatedStyle(() => ({ opacity: v.value, position: "absolute" }));
  const badgeBorderStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(v.value, [0, 1], [capsuleColor, activeColor]),
  }));

  return (
    <Animated.View
      style={[styles.itemContainer, containerStyle]}
      entering={reduceMotion ? undefined : FadeIn.duration(180)}
    >
      <TouchableOpacity
        onPress={onPress}
        onLongPress={onLongPress}
        activeOpacity={0.7}
        style={fitContent ? styles.touchableFit : styles.touchable}
        accessibilityRole="tab"
        accessibilityState={{ selected: isFocused }}
        accessibilityLabel={badge > 0 ? `${label}, ${badge} unread` : label}
      >
        <Animated.View style={[styles.pill, pillStyle]}>
          <View style={styles.iconBox}>
            <Animated.View style={inactiveIconStyle}>
              <Icon name={iconName} size={size.tabIcon} color={inactiveColor} />
            </Animated.View>
            <Animated.View style={activeIconStyle}>
              <Icon name={iconName} size={size.tabIcon} color={activeContentColor} />
            </Animated.View>
            {badge > 0 ? (
              <Animated.View style={[styles.badge, { backgroundColor: colors.nav.badge }, badgeBorderStyle]}>
                <Text variant="caption" color={colors.accentOn.danger} style={styles.badgeText} numberOfLines={1}>
                  {badge > 9 ? "9+" : badge}
                </Text>
              </Animated.View>
            ) : null}
          </View>

          <Animated.View style={[styles.textWrapper, textWrapperStyle]}>
            <Animated.View style={textStyle}>
              <Text variant="bodySm" color={activeContentColor} numberOfLines={1} style={styles.label}>
                {label}
              </Text>
            </Animated.View>
          </Animated.View>

          {/* invisible measurer — gives the wrapper its expand target */}
          <Text
            variant="bodySm"
            numberOfLines={1}
            style={[styles.label, styles.measure]}
            onLayout={(e) => {
              const w = Math.ceil(e.nativeEvent.layout.width);
              if (w && w !== labelWidth) setLabelWidth(w);
            }}
          >
            {label}
          </Text>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 30,
    left: 20,
    right: 20,
    alignItems: "center",
  },
  containerInline: {
    alignItems: "flex-start",
  },
  bar: {
    flexDirection: "row",
    borderRadius: 35,
    height: 70,
    padding: 8,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  barFull: {
    width: "100%",
    justifyContent: "space-between",
  },
  barFit: {
    justifyContent: "center",
    gap: 8,
  },
  itemContainer: {
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 30,
  },
  touchable: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  touchableFit: {
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  pill: {
    borderRadius: 100,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 48,
    minWidth: 48,
    alignSelf: "center",
  },
  iconBox: {
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  textWrapper: {
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  label: {
    fontFamily: fonts.bold,
    textAlign: "center",
  },
  measure: {
    position: "absolute",
    opacity: 0,
  },
  badge: {
    position: "absolute",
    top: -5,
    right: -8,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    zIndex: 10,
  },
  badgeText: {
    fontFamily: fonts.extrabold,
  },
});
