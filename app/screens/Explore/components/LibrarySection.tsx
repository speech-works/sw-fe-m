import { useNavigation } from "@react-navigation/native";
import React from "react";
import { StyleSheet, View } from "react-native";
import {
  useTheme,
  spacing,
  space,
  radius,
  Text,
  Icon,
  icons,
} from "../../../design-system";
import PressableScale from "../../../components/PressableScale";

interface LibrarySectionProps {
  onLayoutCapture?: (event: any) => void;
}

const LibrarySection: React.FC<LibrarySectionProps> = ({ onLayoutCapture }) => {
  const navigation = useNavigation<any>();
  const { colors, elevation } = useTheme();
  // Solid vivid accent card (Community pattern). Dark ink reads on the fill.
  const ink = colors.accentOn.success;

  return (
    <View
      onLayout={(event) => {
        if (onLayoutCapture) onLayoutCapture(event);
      }}
      style={styles.container}
    >
      <Text variant="h3">Library</Text>

      <PressableScale
        style={[styles.cardContainer, elevation.e2]}
        scaleTo={0.98}
        onPress={() =>
          navigation.navigate("LibraryStack", {
            screen: "Library",
            params: { from: "EXPLORE" },
          })
        }
      >
        <View style={[styles.gradient, { backgroundColor: colors.accent.success }]}>
          {/* Decorative ink bubbles (dark-on-bright texture) */}
          <View
            style={[
              styles.bubble,
              { backgroundColor: ink, width: 100, height: 100, top: -20, right: -20, opacity: 0.18 },
            ]}
          />
          <View
            style={[
              styles.bubble,
              { backgroundColor: ink, width: 60, height: 60, bottom: 10, left: 10, opacity: 0.13 },
            ]}
          />
          <View
            style={[
              styles.bubble,
              { backgroundColor: ink, width: 40, height: 40, top: 20, right: 80, opacity: 0.1 },
            ]}
          />

          <View style={styles.content}>
            <View style={styles.textContainer}>
              <Text variant="h2" color={ink}>Video Tutorials</Text>
              <Text variant="bodySm" color={ink}>
                Master speech techniques with our curated video collection.
              </Text>
            </View>

            <View style={[styles.iconCircle, { backgroundColor: colors.surface.default }]}>
              <Icon name={icons.play} size={24} color={colors.text.primary} style={styles.playGlyph} />
            </View>
          </View>

          {/* Tag / Badge — dark surface chip with a vivid glyph (in-app chip pattern). */}
          <View style={[styles.badge, { backgroundColor: colors.surface.default }]}>
            <Icon name={icons.play} size={12} color={colors.text.primary} />
            <Text variant="caption" color="primary">Recorded Lessons</Text>
          </View>
        </View>
      </PressableScale>
    </View>
  );
};

export default React.memo(LibrarySection);

const styles = StyleSheet.create({
  container: {
    gap: space.groupGap,
  },
  cardContainer: {
    width: "100%",
    height: 200,
    borderRadius: radius.card,
    overflow: "hidden", // Clips the gradient and bubbles
  },
  gradient: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing["3xl"],
    justifyContent: "space-between",
    position: "relative",
  },
  bubble: {
    position: "absolute",
    borderRadius: radius.full,
  },
  content: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  textContainer: {
    flex: 1,
    paddingRight: spacing.lg,
    gap: spacing.xs,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: radius.input,
    justifyContent: "center",
    alignItems: "center",
  },
  playGlyph: {
    marginLeft: 4,
  },
  badge: {
    flexDirection: "row",
    alignSelf: "flex-start",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    marginTop: spacing.md,
  },
});
