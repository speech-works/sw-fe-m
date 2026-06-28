import React, { useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, {
  Easing,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
} from "react-native-reanimated";
import { useTheme } from "../useTheme";
import { fonts } from "../primitives/fonts";
import { Text } from "./Text";

export interface TabDockItem {
  key: string;
  /** Shown only when this tab is active (the expanding pill). */
  label: string;
  /** A MaterialCommunityIcons glyph (matches the app nav). */
  icon: string;
  /** Optional unread/count badge. */
  badge?: number;
}

export interface TabDockProps {
  items: TabDockItem[];
  activeKey: string;
  onSelect: (key: string) => void;
  onLongPress?: (key: string) => void;
}

/**
 * The floating menu dock — a `surface.elevated` capsule whose active tab is an
 * orange pill (icon + label); inactive tabs are icon-only. This is the single
 * source for the app's bottom nav AND any in-page tab dock, so they never drift.
 * Re-themes via `nav.*` tokens; the expanding-pill animation is intrinsic.
 */
export const TabDock: React.FC<TabDockProps> = ({ items, activeKey, onSelect, onLongPress }) => {
  const { colors } = useTheme();
  return (
    <View style={styles.container} pointerEvents="box-none">
      <View style={[styles.bar, { backgroundColor: colors.surface.elevated, shadowColor: colors.shadow }]}>
        {items.map((item) => (
          <DockItem
            key={item.key}
            isFocused={activeKey === item.key}
            label={item.label}
            iconName={item.icon}
            badge={item.badge ?? 0}
            onPress={() => onSelect(item.key)}
            onLongPress={onLongPress ? () => onLongPress(item.key) : undefined}
          />
        ))}
      </View>
    </View>
  );
};

interface DockItemProps {
  isFocused: boolean;
  label: string;
  iconName: string;
  badge: number;
  onPress: () => void;
  onLongPress?: () => void;
}

const DockItem: React.FC<DockItemProps> = ({ isFocused, label, iconName, badge, onPress, onLongPress }) => {
  const { colors } = useTheme();
  const activeColor = colors.nav.activePill;
  const activeContentColor = colors.nav.onActive;
  const inactiveColor = colors.nav.inactive;
  const capsuleColor = colors.surface.elevated;

  const [labelWidth, setLabelWidth] = useState(0);
  // Estimate until the real width is measured, so the active label never pops in at 0.
  const targetWidth = labelWidth || Math.round(label.length * 8.2);

  const v = useDerivedValue(
    () => withTiming(isFocused ? 1 : 0, { duration: 100, easing: Easing.out(Easing.quad) }),
    [isFocused],
  );

  const containerStyle = useAnimatedStyle(() => ({
    flex: interpolate(v.value, [0, 1], [1, 2.5]),
  }));
  const pillStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(v.value, [0, 1], ["transparent", activeColor]),
    paddingHorizontal: interpolate(v.value, [0, 1], [0, 18]),
  }));
  const textWrapperStyle = useAnimatedStyle(() => ({
    width: interpolate(v.value, [0, 1], [0, targetWidth]),
    marginLeft: interpolate(v.value, [0, 1], [0, 8]),
    opacity: v.value,
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
    <Animated.View style={[styles.itemContainer, containerStyle]}>
      <TouchableOpacity
        onPress={onPress}
        onLongPress={onLongPress}
        activeOpacity={0.7}
        style={styles.touchable}
        accessibilityRole="tab"
        accessibilityState={{ selected: isFocused }}
        accessibilityLabel={badge > 0 ? `${label}, ${badge} unread` : label}
      >
        <Animated.View style={[styles.pill, pillStyle]}>
          <View style={styles.iconBox}>
            <Animated.View style={inactiveIconStyle}>
              <MaterialCommunityIcons name={iconName as any} size={24} color={inactiveColor} />
            </Animated.View>
            <Animated.View style={activeIconStyle}>
              <MaterialCommunityIcons name={iconName as any} size={24} color={activeContentColor} />
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
  bar: {
    flexDirection: "row",
    borderRadius: 35,
    height: 70,
    padding: 8,
    width: "100%",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
    justifyContent: "space-between",
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
  pill: {
    borderRadius: 100,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 48,
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
