import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Icon from "react-native-vector-icons/FontAwesome5";

interface MasonryTipsProps {
  tips: string[];
}

const PASTEL_PALETTE = [
  { colors: ["#E0F2FE", "#F0F9FF"], text: "#0C4A6E", badge: "#0284C7" }, // Sky Blue
  { colors: ["#FFF7ED", "#FFFAF0"], text: "#7C2D12", badge: "#EA580C" }, // Soft Orange
  { colors: ["#F0FDF4", "#F6FFFA"], text: "#14532D", badge: "#16A34A" }, // Mint Green
  { colors: ["#FAF5FF", "#FCFAFF"], text: "#581C87", badge: "#9333EA" }, // Lavender
];

const ICONS = ["feather-alt", "magic", "star", "quote-right"];

const MasonryTips: React.FC<MasonryTipsProps> = ({ tips }) => {
  // Smart Bento Logic:
  // We want a mix of 2-col rows and 1-col rows.
  // Pattern: [Half, Half] -> [Full] -> [Half, Half] ...
  // This ensures variety and alignment.

  const renderCard = (tip: string, index: number, isFullWidth: boolean) => {
    const colorTheme = PASTEL_PALETTE[index % PASTEL_PALETTE.length];
    const iconName = ICONS[index % ICONS.length];

    // Randomized bubble positions
    const bubble1Top = (index * 37) % 60;
    const bubble1Left = (index * 19) % 70;
    const bubble2Bottom = (index * 23) % 40;
    const bubble2Right = (index * 41) % 50;

    return (
      <View
        key={index}
        style={[
          styles.cardContainer,
          styles.shadow,
          isFullWidth ? styles.fullWidth : styles.halfWidth,
        ]}
      >
        <LinearGradient
          colors={colorTheme.colors as [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardGradient}
        >
          {/* Background Ambient Bubbles */}
          <View
            style={[
              styles.bubble,
              {
                top: bubble1Top,
                left: bubble1Left,
                backgroundColor: colorTheme.badge,
                opacity: 0.03,
                width: 60,
                height: 60,
              },
            ]}
          />
          <View
            style={[
              styles.bubble,
              {
                bottom: bubble2Bottom,
                right: bubble2Right,
                backgroundColor: colorTheme.badge,
                opacity: 0.04,
                width: 40,
                height: 40,
              },
            ]}
          />

          {/* Icon Watermark */}
          <View style={styles.watermarkContainer}>
            <Icon
              name={iconName}
              solid
              size={96} // Much bigger
              color={colorTheme.badge}
              style={{ opacity: 0.08 }} // Slightly more visible
            />
          </View>

          {/* Content Layer */}
          <View style={styles.contentLayer}>
            <View style={styles.headerRow}>
              <View
                style={[styles.badge, { backgroundColor: colorTheme.badge }]}
              >
                <Text style={styles.badgeText}>TIP {index + 1}</Text>
              </View>
            </View>
            <Text style={[styles.body, { color: colorTheme.text }]}>{tip}</Text>
          </View>

          {/* Glass Glare */}
          <LinearGradient
            colors={["rgba(255,255,255,0.4)", "rgba(255,255,255,0)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 0.4 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
        </LinearGradient>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {tips.map((tip, index) => {
        // Pattern: Indices 2, 5, 8... (every 3rd item starting at 2) are Full Width
        // Or simply: If it's the 3rd item (index 2), make it full.
        // Let's try a repeating pattern: 2 small, 1 big.
        // 0 (s), 1 (s), 2 (b), 3 (s), 4 (s), 5 (b)
        const isFullWidth = (index + 1) % 3 === 0;

        return renderCard(tip, index, isFullWidth);
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  cardContainer: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.6)",
    flexGrow: 1, // Ensures cards fill space
  },
  halfWidth: {
    width: "48%",
  },
  fullWidth: {
    width: "100%",
  },
  shadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  cardGradient: {
    borderRadius: 24,
    padding: 20,
    gap: 12,
    overflow: "hidden",
    position: "relative",
    flex: 1, // Fixes stretching issue, fills parent height gracefully
    minHeight: 140,
  },
  // Decorations
  bubble: {
    position: "absolute",
    borderRadius: 999,
  },
  watermarkContainer: {
    position: "absolute",
    bottom: -24,
    right: -16,
    transform: [{ rotate: "-25deg" }],
    zIndex: 0,
  },
  contentLayer: {
    zIndex: 1,
    gap: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#FFF",
    letterSpacing: 0.5,
  },
  body: {
    fontSize: 15,
    lineHeight: 23,
    fontWeight: "500",
    letterSpacing: 0.1,
  },
});

export default MasonryTips;
