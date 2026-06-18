import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, { LinearTransition } from "react-native-reanimated";
import PressableScale from "../PressableScale";
import { theme } from "../../Theme/tokens";

interface SegmentTab {
  key: string;
  label: string;
  /** Optional unread/notification count shown as a small badge. */
  badge?: number;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}

interface SegmentedTabsProps {
  tabs: SegmentTab[];
  active: string;
  onChange: (key: string) => void;
  activeColor?: string;
}

const C = {
  orange400: theme.colors.library.orange[400],
  orange500: theme.colors.library.orange[500],
  title: theme.colors.text.title,
  muted: theme.colors.text.default,
  dark: "#1A1A1A",
  lightCircle: "rgba(0,0,0,0.05)",
};

/** A modern pill + circle segmented control for Community top tabs. */
const SegmentedTabs = ({ tabs, active, onChange, activeColor }: SegmentedTabsProps) => (
  <View style={styles.track}>
    {tabs.map((t) => {
      const isActive = t.key === active;
      return (
        <Animated.View 
          key={t.key} 
          layout={LinearTransition.springify().damping(18).stiffness(150)}
        >
          <PressableScale
            style={[
              isActive ? styles.activePill : styles.inactiveCircle,
              isActive && activeColor ? { backgroundColor: activeColor } : undefined,
            ]}
            scaleTo={0.95}
            haptic={false}
            onPress={() => onChange(t.key)}
            accessibilityLabel={t.label}
          >
            {isActive ? (
              <>
                <MaterialCommunityIcons name={t.icon} size={20} color="#FFFFFF" />
                <Text style={styles.activeLabel} numberOfLines={1}>
                  {t.label}
                </Text>
              </>
            ) : (
              <MaterialCommunityIcons name={t.icon} size={20} color={C.title} />
            )}

            {t.badge && t.badge > 0 ? (
              <View style={isActive ? styles.badgeActive : styles.badgeInactive}>
                <Text style={styles.badgeText}>{t.badge > 9 ? "9+" : t.badge}</Text>
              </View>
            ) : null}
          </PressableScale>
        </Animated.View>
      );
    })}
  </View>
);

export default SegmentedTabs;

const styles = StyleSheet.create({
  track: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  activePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.title,
    paddingHorizontal: 18,
    height: 44,
    borderRadius: 100,
    gap: 6,
  },
  activeLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  inactiveCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.lightCircle,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeActive: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    backgroundColor: C.orange500,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeInactive: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    backgroundColor: C.orange500,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#F9F6F4", // Approximate page background
  },
  badgeText: { color: "#FFFFFF", fontSize: 10, fontWeight: "800" },
});
