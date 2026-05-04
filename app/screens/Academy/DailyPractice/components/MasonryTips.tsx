import { LinearGradient } from "expo-linear-gradient";
import React, { useRef, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  NativeSyntheticEvent,
  NativeScrollEvent,
  LayoutChangeEvent,
} from "react-native";
import Icon from "react-native-vector-icons/FontAwesome5";
import { theme } from "../../../../Theme/tokens";
import { parseTextStyle } from "../../../../util/functions/parseStyles";

interface MasonryTipsProps {
  tips: string[];
}

const PREMIUM_PALETTE = [
  { colors: ["#0EA5E9", "#0369A1"], text: "#FFF", badge: "#FFF", shadow: "#0EA5E9", accent: "#0284C7" }, // Deep Sky
  { colors: ["#F59E0B", "#D97706"], text: "#FFF", badge: "#FFF", shadow: "#F59E0B", accent: "#B45309" }, // Warm Amber
  { colors: ["#10B981", "#059669"], text: "#FFF", badge: "#FFF", shadow: "#10B981", accent: "#047857" }, // Emerald
  { colors: ["#A78BFA", "#7C3AED"], text: "#FFF", badge: "#FFF", shadow: "#A78BFA", accent: "#6D28D9" }, // Violet
];

const ICONS = ["feather-alt", "magic", "star", "quote-right"];

const MasonryTips: React.FC<MasonryTipsProps> = ({ tips }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);

  const CARD_WIDTH = containerWidth > 0 ? containerWidth * 0.86 : 300;
  const SPACING = 16;
  const SIDE_INSET = containerWidth > 0 ? (containerWidth - CARD_WIDTH) / 2 : 24;

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / (CARD_WIDTH + SPACING));
    if (index !== activeIndex) {
      setActiveIndex(index);
    }
  };

  const onLayout = (event: LayoutChangeEvent) => {
    setContainerWidth(event.nativeEvent.layout.width);
  };

  const renderItem = ({ item, index }: { item: string; index: number }) => {
    const colorTheme = PREMIUM_PALETTE[index % PREMIUM_PALETTE.length];
    const iconName = ICONS[index % ICONS.length];

    return (
      <View style={{ width: CARD_WIDTH, marginRight: SPACING, paddingVertical: 15 }}>
        <View style={[styles.cardWrapper, { shadowColor: colorTheme.shadow }]}>
          <LinearGradient
            colors={colorTheme.colors as [string, string, ...string[]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cardGradient}
          >
            {/* Glass Decorations */}
            <View style={[styles.bubble, styles.bubbleLarge]} />
            <View style={[styles.bubble, styles.bubbleSmall]} />

            {/* Watermark Icon */}
            <View style={styles.watermarkContainer}>
              <Icon
                name={iconName}
                solid
                size={120}
                color="#FFF"
                style={{ opacity: 0.12 }}
              />
            </View>

            {/* Content Layer */}
            <View style={styles.contentLayer}>
              <View style={styles.headerRow}>
                <View style={styles.chip}>
                  <Icon name="lightbulb" size={10} color={colorTheme.accent} solid />
                  <Text style={[styles.chipText, { color: colorTheme.accent }]}>PRO TIP</Text>
                </View>
              </View>
              
              <Text style={[styles.body, { color: colorTheme.text }]}>
                {item}
              </Text>
            </View>

            {/* Premium Glass Glare Overlay */}
            <LinearGradient
              colors={["rgba(255,255,255,0.3)", "rgba(255,255,255,0)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0.5, y: 0.5 }}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
          </LinearGradient>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container} onLayout={onLayout}>
      {containerWidth > 0 && (
        <FlatList
          data={tips}
          renderItem={renderItem}
          keyExtractor={(_, index) => index.toString()}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={CARD_WIDTH + SPACING}
          snapToAlignment="start"
          decelerationRate="fast"
          onScroll={onScroll}
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingHorizontal: SIDE_INSET }}
        />
      )}
      
      {tips.length > 1 && (
        <View style={styles.pagination}>
          {tips.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === activeIndex ? styles.activeDot : styles.inactiveDot,
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  cardWrapper: {
    borderRadius: 28,
    backgroundColor: "#FFF",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 8,
    overflow: "hidden",
  },
  cardGradient: {
    padding: 24,
    minHeight: 160,
    justifyContent: "center",
    position: "relative",
  },
  // Decorations
  bubble: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
  },
  bubbleLarge: {
    width: 140,
    height: 140,
    top: -50,
    right: -30,
  },
  bubbleSmall: {
    width: 70,
    height: 70,
    bottom: -20,
    left: -10,
  },
  watermarkContainer: {
    position: "absolute",
    bottom: -20,
    right: -20,
    transform: [{ rotate: "-15deg" }],
  },
  contentLayer: {
    gap: 16,
    zIndex: 2,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 8,
  },
  chipText: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },
  body: {
    ...parseTextStyle(theme.typography.Heading3),
    fontSize: 17,
    lineHeight: 26,
    fontWeight: "700",
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
    gap: 8,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  activeDot: {
    width: 24,
    backgroundColor: "#94A3B8",
  },
  inactiveDot: {
    width: 6,
    backgroundColor: "#E2E8F0",
  },
});

export default MasonryTips;
