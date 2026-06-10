import React from "react";
import { StyleSheet, Text, View } from "react-native";
import PressableScale from "../PressableScale";
import { theme } from "../../Theme/tokens";

export interface SegmentTab {
  key: string;
  label: string;
  /** Optional unread/notification count shown as a small badge. */
  badge?: number;
}

interface SegmentedTabsProps {
  tabs: SegmentTab[];
  active: string;
  onChange: (key: string) => void;
}

const C = {
  orange500: theme.colors.library.orange[500],
  title: theme.colors.text.title,
  muted: theme.colors.text.default,
  track: theme.colors.library.orange[100],
};

/** A compact pill segmented control (e.g. "Us" / "Timeline" at the top of Community). */
const SegmentedTabs = ({ tabs, active, onChange }: SegmentedTabsProps) => (
  <View style={styles.track}>
    {tabs.map((t) => {
      const isActive = t.key === active;
      return (
        <PressableScale
          key={t.key}
          style={[styles.segment, isActive && styles.segmentActive]}
          scaleTo={0.97}
          haptic={false}
          onPress={() => onChange(t.key)}
          accessibilityLabel={t.label}
        >
          <Text style={[styles.label, isActive && styles.labelActive]} numberOfLines={1}>
            {t.label}
          </Text>
          {t.badge && t.badge > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{t.badge > 9 ? "9+" : t.badge}</Text>
            </View>
          ) : null}
        </PressableScale>
      );
    })}
  </View>
);

export default SegmentedTabs;

const styles = StyleSheet.create({
  track: {
    flexDirection: "row",
    backgroundColor: C.track,
    borderRadius: 100,
    padding: 4,
    gap: 4,
  },
  segment: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    borderRadius: 100,
    backgroundColor: "transparent",
  },
  segmentActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#803600",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
  },
  label: { fontSize: 14, fontWeight: "800", color: C.muted },
  labelActive: { color: C.title },
  badge: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    backgroundColor: C.orange500,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { color: "#FFFFFF", fontSize: 10, fontWeight: "800" },
});
