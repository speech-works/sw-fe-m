import React, { useState } from "react";
import {
  StyleSheet,
  View,
  FlatList,
  NativeSyntheticEvent,
  NativeScrollEvent,
  LayoutChangeEvent,
} from "react-native";
import {
  Gradient,
  GradientName,
  Icon,
  IconName,
  Text,
  makeStyles,
  opacity,
  radius,
  size,
  spacing,
  useTheme,
} from "../../../../design-system";
import type { SemanticColors } from "../../../../design-system";

interface MasonryTipsProps {
  tips: string[];
}

// Vivid card recipes — DS decorative gradient tokens paired with the
// AA-correct dark ink for that fill (never white-on-bright).
const CARD_RECIPES: { token: GradientName; ink: (c: SemanticColors) => string }[] = [
  { token: "aurora", ink: (c) => c.accentOn.purple },
  { token: "brand", ink: (c) => c.action.onPrimary },
  { token: "meadow", ink: (c) => c.accentOn.success },
  { token: "sunrise", ink: (c) => c.accentOn.danger },
];

const ICONS: IconName[] = ["sparkles", "zap", "star", "message-circle"];

const MasonryTips: React.FC<MasonryTipsProps> = ({ tips }) => {
  const { colors } = useTheme();
  const styles = useStyles();
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
    const recipe = CARD_RECIPES[index % CARD_RECIPES.length];
    const ink = recipe.ink(colors);
    const iconName = ICONS[index % ICONS.length];

    return (
      <View style={{ width: CARD_WIDTH, marginRight: SPACING, paddingVertical: 15 }}>
        <View style={styles.cardWrapper}>
          <Gradient
            token={recipe.token}
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
                size={120}
                color={ink}
                style={{ opacity: opacity.faint }}
              />
            </View>

            {/* Content Layer */}
            <View style={styles.contentLayer}>
              <View style={styles.headerRow}>
                <View style={styles.chip}>
                  <Icon name="lightbulb" size={10} color={colors.text.onInverse} />
                  <Text variant="label" color="onInverse">
                    PRO TIP
                  </Text>
                </View>
              </View>

              <Text variant="h3" color={ink}>
                {item}
              </Text>
            </View>

            {/* Premium Glass Glare Overlay */}
            <Gradient
              token="sheen"
              start={{ x: 0, y: 0 }}
              end={{ x: 0.5, y: 0.5 }}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
          </Gradient>
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

const useStyles = makeStyles((c, t) => ({
  container: {
    marginVertical: spacing.md,
  },
  cardWrapper: {
    borderRadius: radius.sheet,
    backgroundColor: c.surface.elevated,
    ...t.elevation.e2,
    overflow: "hidden",
  },
  cardGradient: {
    padding: spacing["2xl"],
    minHeight: 160,
    justifyContent: "center",
    position: "relative",
  },
  // Decorations
  bubble: {
    position: "absolute",
    borderRadius: radius.full,
    backgroundColor: c.surface.inverse,
    opacity: opacity.faint,
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
    gap: spacing.lg,
    zIndex: 2,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: c.surface.inverse,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    gap: spacing.sm,
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  dot: {
    height: size.iconSm / 2,
    borderRadius: radius.xs,
    backgroundColor: c.surface.control,
  },
  activeDot: {
    width: spacing["2xl"],
    backgroundColor: c.text.tertiary,
  },
  inactiveDot: {
    width: size.iconSm / 2,
  },
}));

export default MasonryTips;
